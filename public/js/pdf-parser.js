/**
 * Document & PDF Parser Module for StudyDeck
 * Features:
 * - Server-side PDF extraction via /api/parse-pdf (using python pdfminer.six)
 * - Standalone Client-side PDF extraction (using local pdf.js with precise coordinate-based line preservation)
 * - Robust section & Q&A regex parser for Short Questions, Long Questions, and MCQs
 */

class DocumentParser {
  constructor() {
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    }
  }

  /**
   * Parse an uploaded File object (PDF, DOCX, TXT)
   */
  async parseFile(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
      return this.parsePdf(file);
    } else if (fileName.endsWith('.txt')) {
      const text = await file.text();
      return this.parseRawText(text);
    } else if (fileName.endsWith('.docx') && window.mammoth) {
      const ab = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: ab });
      return this.parseRawText(res.value);
    } else {
      throw new Error(`Unsupported file type: ${file.name}. Please upload PDF, DOCX, or TXT.`);
    }
  }

  /**
   * Parse PDF with hybrid approach: try backend /api/parse-pdf first; fallback to client pdf.js
   */
  async parsePdf(file) {
    // 1. Try server-side parser
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.cards && data.cards.length > 0) {
          console.log(`Backend parsed ${data.cards.length} cards.`);
          return data.cards;
        }
      }
    } catch (e) {
      console.log("Server parser unavailable, using client-side PDF.js...", e);
    }

    // 2. Client-side PDF.js parsing with line-by-line Y-coordinate reconstruction
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort items by vertical position (Y descending) then horizontal (X ascending)
      const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }));

      items.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 4) {
          return b.y - a.y; // Higher Y first
        }
        return a.x - b.x; // Left to right
      });

      // Group into lines based on Y coordinate proximity
      let pageText = "";
      let currentY = null;

      for (const item of items) {
        if (!item.str) continue;
        if (currentY === null || Math.abs(item.y - currentY) > 5) {
          pageText += '\n' + item.str;
          currentY = item.y;
        } else {
          pageText += ' ' + item.str;
        }
      }

      fullText += pageText + '\n\n';
    }

    return this.parseRawText(fullText);
  }

  /**
   * Parse structured raw text into cards
   */
  parseRawText(rawText) {
    const cleaned = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\x0c/g, '\n')
      .replace(/\(cid:127\)/g, '•');

    const lines = cleaned.split('\n').map(l => l.trim());
    const cards = [];

    let currentSec = 'General';
    let currentQ = null;
    let currentA = [];
    let currentOpts = [];
    let cardId = 1;

    const commitCard = () => {
      if (currentQ && (currentA.length > 0 || currentOpts.length > 0)) {
        const isMcq = currentSec === 'MCQ' || currentOpts.length > 0;
        const isLong = currentSec === 'Long Question';
        cards.push({
          id: cardId++,
          category: currentSec,
          type: isMcq ? 'mcq' : (isLong ? 'long' : 'short'),
          q: currentQ,
          a: currentA.join('\n').trim(),
          options: currentOpts.length > 0 ? currentOpts.slice() : null
        });
        currentQ = null;
        currentA = [];
        currentOpts = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Section headers
      if (/SHORT\s+QUESTIONS/i.test(line)) {
        commitCard();
        currentSec = 'Short Question';
        continue;
      } else if (/LONG\s+QUESTIONS/i.test(line)) {
        commitCard();
        currentSec = 'Long Question';
        continue;
      } else if (/MCQS/i.test(line)) {
        commitCard();
        currentSec = 'MCQ';
        continue;
      }

      // Check for question numbering (e.g. "1. What is ...", "2. Usability ...")
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (qMatch && !/^(Answer|Option|[A-D][\)\.])/i.test(line)) {
        commitCard();
        currentQ = line;
        continue;
      }

      // Check for Q: / Question: prefix
      const qPrefixMatch = line.match(/^(Question|Q)[\s\d]*:\s*(.+)$/i);
      if (qPrefixMatch) {
        commitCard();
        currentQ = qPrefixMatch[2];
        continue;
      }

      if (currentQ) {
        // Check for MCQ options: A) ... B) ...
        if (/^[A-D][\)\.]\s+/i.test(line)) {
          currentOpts.push(line);
        } else if (/^Answer:\s*([A-D])\b/i.test(line)) {
          const letter = line.match(/^Answer:\s*([A-D])\b/i)[1].toUpperCase();
          const matchOpt = currentOpts.find(o => o.toUpperCase().startsWith(letter));
          currentA.push(`Correct Answer: ${letter}` + (matchOpt ? ` (${matchOpt})` : ''));
        } else if (/^Answer:\s*(.+)$/i.test(line)) {
          currentA.push(line.replace(/^Answer:\s*/i, ''));
        } else {
          currentA.push(line);
        }
      }
    }

    commitCard();

    // Fallback: if no questions found with numbering, try definition matching
    if (cards.length === 0) {
      for (const l of lines) {
        const m = l.match(/^([^:\-–]{3,40})[:\-–]\s+(.{15,})$/);
        if (m) {
          cards.push({
            id: cardId++,
            category: 'Short Question',
            type: 'short',
            q: `What is ${m[1].trim()}?`,
            a: m[2].trim(),
            options: null
          });
        }
      }
    }

    return cards;
  }
}

window.documentParser = new DocumentParser();


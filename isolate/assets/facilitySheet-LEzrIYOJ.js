const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jsQR-CrbJUbWv.js","assets/icons-BxQpodNr.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { cx as facilityReportFileName, G as toDdMmmYyyy, D as DEFAULT_SETTINGS, cu as todayIso, c3 as daysUntil, c4 as requiredDocumentsMissing, cy as deriveFireNocStatus, cc as surveillanceVisits, cz as addMonthsToIso, cA as departmentsForFacility, cB as departmentNoun, X as saqshamDocumentsStatusOf, c7 as documentsStatusReportDisplayOf, ci as formatVisitDate, cC as reportTypeLabel, cD as DEFAULT_REPORT_TYPE_LABELS, S as SCORE_DECIMALS, aw as lastQuarters, c9 as iaScoreOf, ce as formatInr } from './AppShell-CP099uvN.js';
import { b as IA_CARD, a as readScoreBands, l as layoutIaCard, c as IA_SERIES$1, i as iaChangeText, s as scoreBandFor } from './scoreBands-CA46Kez8.js';
import { b as buildingBucketOf } from './buildingBuckets-CQds7ysI.js';
import { O as ORG_SIGNATURE } from './org-DjtYn14q.js';
import { p as phoneForViewer } from './phone-C-n0eG_z.js';
import './vendor-motion-DgC1stbS.js';
import './icons-BxQpodNr.js';
import './index-CBV6wOh8.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// qrcode
//---------------------------------------------------------------------

/**
 * qrcode
 * @param typeNumber 1 to 40
 * @param errorCorrectionLevel 'L','M','Q','H'
 */
const qrcode = function(typeNumber, errorCorrectionLevel) {

  const PAD0 = 0xEC;
  const PAD1 = 0x11;

  let _typeNumber = typeNumber;
  const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  let _modules = null;
  let _moduleCount = 0;
  let _dataCache = null;
  const _dataList = [];

  const _this = {};

  const makeImpl = function(test, maskPattern) {

    _moduleCount = _typeNumber * 4 + 17;
    _modules = function(moduleCount) {
      const modules = new Array(moduleCount);
      for (let row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (let col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    }(_moduleCount);

    setupPositionProbePattern(0, 0);
    setupPositionProbePattern(_moduleCount - 7, 0);
    setupPositionProbePattern(0, _moduleCount - 7);
    setupPositionAdjustPattern();
    setupTimingPattern();
    setupTypeInfo(test, maskPattern);

    if (_typeNumber >= 7) {
      setupTypeNumber(test);
    }

    if (_dataCache == null) {
      _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
    }

    mapData(_dataCache, maskPattern);
  };

  const setupPositionProbePattern = function(row, col) {

    for (let r = -1; r <= 7; r += 1) {

      if (row + r <= -1 || _moduleCount <= row + r) continue;

      for (let c = -1; c <= 7; c += 1) {

        if (col + c <= -1 || _moduleCount <= col + c) continue;

        if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
            || (0 <= c && c <= 6 && (r == 0 || r == 6) )
            || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
          _modules[row + r][col + c] = true;
        } else {
          _modules[row + r][col + c] = false;
        }
      }
    }
  };

  const getBestMaskPattern = function() {

    let minLostPoint = 0;
    let pattern = 0;

    for (let i = 0; i < 8; i += 1) {

      makeImpl(true, i);

      const lostPoint = QRUtil.getLostPoint(_this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  };

  const setupTimingPattern = function() {

    for (let r = 8; r < _moduleCount - 8; r += 1) {
      if (_modules[r][6] != null) {
        continue;
      }
      _modules[r][6] = (r % 2 == 0);
    }

    for (let c = 8; c < _moduleCount - 8; c += 1) {
      if (_modules[6][c] != null) {
        continue;
      }
      _modules[6][c] = (c % 2 == 0);
    }
  };

  const setupPositionAdjustPattern = function() {

    const pos = QRUtil.getPatternPosition(_typeNumber);

    for (let i = 0; i < pos.length; i += 1) {

      for (let j = 0; j < pos.length; j += 1) {

        const row = pos[i];
        const col = pos[j];

        if (_modules[row][col] != null) {
          continue;
        }

        for (let r = -2; r <= 2; r += 1) {

          for (let c = -2; c <= 2; c += 1) {

            if (r == -2 || r == 2 || c == -2 || c == 2
                || (r == 0 && c == 0) ) {
              _modules[row + r][col + c] = true;
            } else {
              _modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  };

  const setupTypeNumber = function(test) {

    const bits = QRUtil.getBCHTypeNumber(_typeNumber);

    for (let i = 0; i < 18; i += 1) {
      const mod = (!test && ( (bits >> i) & 1) == 1);
      _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
    }

    for (let i = 0; i < 18; i += 1) {
      const mod = (!test && ( (bits >> i) & 1) == 1);
      _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  };

  const setupTypeInfo = function(test, maskPattern) {

    const data = (_errorCorrectionLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);

    // vertical
    for (let i = 0; i < 15; i += 1) {

      const mod = (!test && ( (bits >> i) & 1) == 1);

      if (i < 6) {
        _modules[i][8] = mod;
      } else if (i < 8) {
        _modules[i + 1][8] = mod;
      } else {
        _modules[_moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (let i = 0; i < 15; i += 1) {

      const mod = (!test && ( (bits >> i) & 1) == 1);

      if (i < 8) {
        _modules[8][_moduleCount - i - 1] = mod;
      } else if (i < 9) {
        _modules[8][15 - i - 1 + 1] = mod;
      } else {
        _modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    _modules[_moduleCount - 8][8] = (!test);
  };

  const mapData = function(data, maskPattern) {

    let inc = -1;
    let row = _moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunction(maskPattern);

    for (let col = _moduleCount - 1; col > 0; col -= 2) {

      if (col == 6) col -= 1;

      while (true) {

        for (let c = 0; c < 2; c += 1) {

          if (_modules[row][col - c] == null) {

            let dark = false;

            if (byteIndex < data.length) {
              dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
            }

            const mask = maskFunc(row, col - c);

            if (mask) {
              dark = !dark;
            }

            _modules[row][col - c] = dark;
            bitIndex -= 1;

            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || _moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };

  const createBytes = function(buffer, rsBlocks) {

    let offset = 0;

    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r += 1) {

      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);

      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;

      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    const data = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }

    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }

    return data;
  };

  const createData = function(typeNumber, errorCorrectionLevel, dataList) {

    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

    const buffer = qrBitBuffer();

    for (let i = 0; i < dataList.length; i += 1) {
      const data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
      data.write(buffer);
    }

    // calc num max data.
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw 'code length overflow. ('
        + buffer.getLengthInBits()
        + '>'
        + totalDataCount * 8
        + ')';
    }

    // end code
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    // padding
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }

    // padding
    while (true) {

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD0, 8);

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(PAD1, 8);
    }

    return createBytes(buffer, rsBlocks);
  };

  _this.addData = function(data, mode) {

    mode = mode || 'Byte';

    let newData = null;

    switch(mode) {
    case 'Numeric' :
      newData = qrNumber(data);
      break;
    case 'Alphanumeric' :
      newData = qrAlphaNum(data);
      break;
    case 'Byte' :
      newData = qr8BitByte(data);
      break;
    case 'Kanji' :
      newData = qrKanji(data);
      break;
    default :
      throw 'mode:' + mode;
    }

    _dataList.push(newData);
    _dataCache = null;
  };

  _this.isDark = function(row, col) {
    if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
      throw row + ',' + col;
    }
    return _modules[row][col];
  };

  _this.getModuleCount = function() {
    return _moduleCount;
  };

  _this.make = function() {
    if (_typeNumber < 1) {
      let typeNumber = 1;

      for (; typeNumber < 40; typeNumber++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
        const buffer = qrBitBuffer();

        for (let i = 0; i < _dataList.length; i++) {
          const data = _dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
          data.write(buffer);
        }

        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }

        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }

      _typeNumber = typeNumber;
    }

    makeImpl(false, getBestMaskPattern() );
  };

  _this.createTableTag = function(cellSize, margin) {

    cellSize = cellSize || 2;
    margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

    let qrHtml = '';

    qrHtml += '<table style="';
    qrHtml += ' border-width: 0px; border-style: none;';
    qrHtml += ' border-collapse: collapse;';
    qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
    qrHtml += '">';
    qrHtml += '<tbody>';

    for (let r = 0; r < _this.getModuleCount(); r += 1) {

      qrHtml += '<tr>';

      for (let c = 0; c < _this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += ' border-width: 0px; border-style: none;';
        qrHtml += ' border-collapse: collapse;';
        qrHtml += ' padding: 0px; margin: 0px;';
        qrHtml += ' width: ' + cellSize + 'px;';
        qrHtml += ' height: ' + cellSize + 'px;';
        qrHtml += ' background-color: ';
        qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
        qrHtml += ';';
        qrHtml += '"/>';
      }

      qrHtml += '</tr>';
    }

    qrHtml += '</tbody>';
    qrHtml += '</table>';

    return qrHtml;
  };

  _this.createSvgTag = function(cellSize, margin, alt, title) {

    let opts = {};
    if (typeof arguments[0] == 'object') {
      // Called by options.
      opts = arguments[0];
      // overwrite cellSize and margin.
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }

    cellSize = cellSize || 2;
    margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

    // Compose alt property surrogate
    alt = (typeof alt === 'string') ? {text: alt} : alt || {};
    alt.text = alt.text || null;
    alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

    // Compose title property surrogate
    title = (typeof title === 'string') ? {text: title} : title || {};
    title.text = title.text || null;
    title.id = (title.text) ? title.id || 'qrcode-title' : null;

    const size = _this.getModuleCount() * cellSize + margin * 2;
    let c, mc, r, mr, qrSvg='', rect;

    rect = 'l' + cellSize + ',0 0,' + cellSize +
      ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

    qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
    qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
    qrSvg += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
        escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
    qrSvg += '>';
    qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
        escapeXml(title.text) + '</title>' : '';
    qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
        escapeXml(alt.text) + '</description>' : '';
    qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg += '<path d="';

    for (r = 0; r < _this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < _this.getModuleCount(); c += 1) {
        if (_this.isDark(r, c) ) {
          mc = c*cellSize+margin;
          qrSvg += 'M' + mc + ',' + mr + rect;
        }
      }
    }

    qrSvg += '" stroke="transparent" fill="black"/>';
    qrSvg += '</svg>';

    return qrSvg;
  };

  _this.createDataURL = function(cellSize, margin) {

    cellSize = cellSize || 2;
    margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;

    return createDataURL(size, size, function(x, y) {
      if (min <= x && x < max && min <= y && y < max) {
        const c = Math.floor( (x - min) / cellSize);
        const r = Math.floor( (y - min) / cellSize);
        return _this.isDark(r, c)? 0 : 1;
      } else {
        return 1;
      }
    } );
  };

  _this.createImgTag = function(cellSize, margin, alt) {

    cellSize = cellSize || 2;
    margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

    const size = _this.getModuleCount() * cellSize + margin * 2;

    let img = '';
    img += '<img';
    img += '\u0020src="';
    img += _this.createDataURL(cellSize, margin);
    img += '"';
    img += '\u0020width="';
    img += size;
    img += '"';
    img += '\u0020height="';
    img += size;
    img += '"';
    if (alt) {
      img += '\u0020alt="';
      img += escapeXml(alt);
      img += '"';
    }
    img += '/>';

    return img;
  };

  const escapeXml = function(s) {
    let escaped = '';
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      switch(c) {
      case '<': escaped += '&lt;'; break;
      case '>': escaped += '&gt;'; break;
      case '&': escaped += '&amp;'; break;
      case '"': escaped += '&quot;'; break;
      default : escaped += c; break;
      }
    }
    return escaped;
  };

  const _createHalfASCII = function(margin) {
    const cellSize = 1;
    margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;

    let y, x, r1, r2, p;

    const blocks = {
      '██': '█',
      '█ ': '▀',
      ' █': '▄',
      '  ': ' '
    };

    const blocksLastLineNoMargin = {
      '██': '▀',
      '█ ': '▀',
      ' █': ' ',
      '  ': ' '
    };

    let ascii = '';
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = '█';

        if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
          p = ' ';
        }

        if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
          p += ' ';
        }
        else {
          p += '█';
        }

        // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
        ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
      }

      ascii += '\n';
    }

    if (size % 2 && margin > 0) {
      return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
    }

    return ascii.substring(0, ascii.length-1);
  };

  _this.createASCII = function(cellSize, margin) {
    cellSize = cellSize || 1;

    if (cellSize < 2) {
      return _createHalfASCII(margin);
    }

    cellSize -= 1;
    margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

    const size = _this.getModuleCount() * cellSize + margin * 2;
    const min = margin;
    const max = size - margin;

    let y, x, r, p;

    const white = Array(cellSize+1).join('██');
    const black = Array(cellSize+1).join('  ');

    let ascii = '';
    let line = '';
    for (y = 0; y < size; y += 1) {
      r = Math.floor( (y - min) / cellSize);
      line = '';
      for (x = 0; x < size; x += 1) {
        p = 1;

        if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
          p = 0;
        }

        // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
        line += p ? white : black;
      }

      for (r = 0; r < cellSize; r += 1) {
        ascii += line + '\n';
      }
    }

    return ascii.substring(0, ascii.length-1);
  };

  _this.renderTo2dContext = function(context, cellSize) {
    cellSize = cellSize || 2;
    const length = _this.getModuleCount();
    for (let row = 0; row < length; row++) {
      for (let col = 0; col < length; col++) {
        context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  };

  return _this;
};

//---------------------------------------------------------------------
// qrcode.stringToBytes
//---------------------------------------------------------------------

qrcode.stringToBytes = function(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    bytes.push(c & 0xff);
  }
  return bytes;
};

//---------------------------------------------------------------------
// qrcode.createStringToBytes
//---------------------------------------------------------------------

/**
 * @param unicodeData base64 string of byte array.
 * [16bit Unicode],[16bit Bytes], ...
 * @param numChars
 */
qrcode.createStringToBytes = function(unicodeData, numChars) {

  // create conversion map.

  const unicodeMap = function() {

    const bin = base64DecodeInputStream(unicodeData);
    const read = function() {
      const b = bin.read();
      if (b == -1) throw 'eof';
      return b;
    };

    let count = 0;
    const unicodeMap = {};
    while (true) {
      const b0 = bin.read();
      if (b0 == -1) break;
      const b1 = read();
      const b2 = read();
      const b3 = read();
      const k = String.fromCharCode( (b0 << 8) | b1);
      const v = (b2 << 8) | b3;
      unicodeMap[k] = v;
      count += 1;
    }
    if (count != numChars) {
      throw count + ' != ' + numChars;
    }

    return unicodeMap;
  }();

  const unknownChar = '?'.charCodeAt(0);

  return function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else {
        const b = unicodeMap[s.charAt(i)];
        if (typeof b == 'number') {
          if ( (b & 0xff) == b) {
            // 1byte
            bytes.push(b);
          } else {
            // 2bytes
            bytes.push(b >>> 8);
            bytes.push(b & 0xff);
          }
        } else {
          bytes.push(unknownChar);
        }
      }
    }
    return bytes;
  };
};

//---------------------------------------------------------------------
// QRMode
//---------------------------------------------------------------------

const QRMode = {
  MODE_NUMBER :    1 << 0,
  MODE_ALPHA_NUM : 1 << 1,
  MODE_8BIT_BYTE : 1 << 2,
  MODE_KANJI :     1 << 3
};

//---------------------------------------------------------------------
// QRErrorCorrectionLevel
//---------------------------------------------------------------------

const QRErrorCorrectionLevel = {
  L : 1,
  M : 0,
  Q : 3,
  H : 2
};

//---------------------------------------------------------------------
// QRMaskPattern
//---------------------------------------------------------------------

const QRMaskPattern = {
  PATTERN000 : 0,
  PATTERN001 : 1,
  PATTERN010 : 2,
  PATTERN011 : 3,
  PATTERN100 : 4,
  PATTERN101 : 5,
  PATTERN110 : 6,
  PATTERN111 : 7
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

const QRUtil = function() {

  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170]
  ];
  const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
  const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
  const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  const _this = {};

  const getBCHDigit = function(data) {
    let digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  };

  _this.getBCHTypeInfo = function(data) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
      d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
    }
    return ( (data << 10) | d) ^ G15_MASK;
  };

  _this.getBCHTypeNumber = function(data) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
      d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
    }
    return (data << 12) | d;
  };

  _this.getPatternPosition = function(typeNumber) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  };

  _this.getMaskFunction = function(maskPattern) {

    switch (maskPattern) {

    case QRMaskPattern.PATTERN000 :
      return function(i, j) { return (i + j) % 2 == 0; };
    case QRMaskPattern.PATTERN001 :
      return function(i, j) { return i % 2 == 0; };
    case QRMaskPattern.PATTERN010 :
      return function(i, j) { return j % 3 == 0; };
    case QRMaskPattern.PATTERN011 :
      return function(i, j) { return (i + j) % 3 == 0; };
    case QRMaskPattern.PATTERN100 :
      return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
    case QRMaskPattern.PATTERN101 :
      return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
    case QRMaskPattern.PATTERN110 :
      return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
    case QRMaskPattern.PATTERN111 :
      return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

    default :
      throw 'bad maskPattern:' + maskPattern;
    }
  };

  _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
    }
    return a;
  };

  _this.getLengthInBits = function(mode, type) {

    if (1 <= type && type < 10) {

      // 1 - 9

      switch(mode) {
      case QRMode.MODE_NUMBER    : return 10;
      case QRMode.MODE_ALPHA_NUM : return 9;
      case QRMode.MODE_8BIT_BYTE : return 8;
      case QRMode.MODE_KANJI     : return 8;
      default :
        throw 'mode:' + mode;
      }

    } else if (type < 27) {

      // 10 - 26

      switch(mode) {
      case QRMode.MODE_NUMBER    : return 12;
      case QRMode.MODE_ALPHA_NUM : return 11;
      case QRMode.MODE_8BIT_BYTE : return 16;
      case QRMode.MODE_KANJI     : return 10;
      default :
        throw 'mode:' + mode;
      }

    } else if (type < 41) {

      // 27 - 40

      switch(mode) {
      case QRMode.MODE_NUMBER    : return 14;
      case QRMode.MODE_ALPHA_NUM : return 13;
      case QRMode.MODE_8BIT_BYTE : return 16;
      case QRMode.MODE_KANJI     : return 12;
      default :
        throw 'mode:' + mode;
      }

    } else {
      throw 'type:' + type;
    }
  };

  _this.getLostPoint = function(qrcode) {

    const moduleCount = qrcode.getModuleCount();

    let lostPoint = 0;

    // LEVEL1

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {

        let sameCount = 0;
        const dark = qrcode.isDark(row, col);

        for (let r = -1; r <= 1; r += 1) {

          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }

          for (let c = -1; c <= 1; c += 1) {

            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }

            if (r == 0 && c == 0) {
              continue;
            }

            if (dark == qrcode.isDark(row + r, col + c) ) {
              sameCount += 1;
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += (3 + sameCount - 5);
        }
      }
    }
    // LEVEL2

    for (let row = 0; row < moduleCount - 1; row += 1) {
      for (let col = 0; col < moduleCount - 1; col += 1) {
        let count = 0;
        if (qrcode.isDark(row, col) ) count += 1;
        if (qrcode.isDark(row + 1, col) ) count += 1;
        if (qrcode.isDark(row, col + 1) ) count += 1;
        if (qrcode.isDark(row + 1, col + 1) ) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }

    // LEVEL3

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount - 6; col += 1) {
        if (qrcode.isDark(row, col)
            && !qrcode.isDark(row, col + 1)
            &&  qrcode.isDark(row, col + 2)
            &&  qrcode.isDark(row, col + 3)
            &&  qrcode.isDark(row, col + 4)
            && !qrcode.isDark(row, col + 5)
            &&  qrcode.isDark(row, col + 6) ) {
          lostPoint += 40;
        }
      }
    }

    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount - 6; row += 1) {
        if (qrcode.isDark(row, col)
            && !qrcode.isDark(row + 1, col)
            &&  qrcode.isDark(row + 2, col)
            &&  qrcode.isDark(row + 3, col)
            &&  qrcode.isDark(row + 4, col)
            && !qrcode.isDark(row + 5, col)
            &&  qrcode.isDark(row + 6, col) ) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL4

    let darkCount = 0;

    for (let col = 0; col < moduleCount; col += 1) {
      for (let row = 0; row < moduleCount; row += 1) {
        if (qrcode.isDark(row, col) ) {
          darkCount += 1;
        }
      }
    }

    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  };

  return _this;
}();

//---------------------------------------------------------------------
// QRMath
//---------------------------------------------------------------------

const QRMath = function() {

  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);

  // initialize tables
  for (let i = 0; i < 8; i += 1) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 4]
      ^ EXP_TABLE[i - 5]
      ^ EXP_TABLE[i - 6]
      ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i += 1) {
    LOG_TABLE[EXP_TABLE[i] ] = i;
  }

  const _this = {};

  _this.glog = function(n) {

    if (n < 1) {
      throw 'glog(' + n + ')';
    }

    return LOG_TABLE[n];
  };

  _this.gexp = function(n) {

    while (n < 0) {
      n += 255;
    }

    while (n >= 256) {
      n -= 255;
    }

    return EXP_TABLE[n];
  };

  return _this;
}();

//---------------------------------------------------------------------
// qrPolynomial
//---------------------------------------------------------------------

const qrPolynomial = function(num, shift) {

  if (typeof num.length == 'undefined') {
    throw num.length + '/' + shift;
  }

  const _num = function() {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset += 1;
    }
    const _num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i += 1) {
      _num[i] = num[i + offset];
    }
    return _num;
  }();

  const _this = {};

  _this.getAt = function(index) {
    return _num[index];
  };

  _this.getLength = function() {
    return _num.length;
  };

  _this.multiply = function(e) {

    const num = new Array(_this.getLength() + e.getLength() - 1);

    for (let i = 0; i < _this.getLength(); i += 1) {
      for (let j = 0; j < e.getLength(); j += 1) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
      }
    }

    return qrPolynomial(num, 0);
  };

  _this.mod = function(e) {

    if (_this.getLength() - e.getLength() < 0) {
      return _this;
    }

    const ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

    const num = new Array(_this.getLength() );
    for (let i = 0; i < _this.getLength(); i += 1) {
      num[i] = _this.getAt(i);
    }

    for (let i = 0; i < e.getLength(); i += 1) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
    }

    // recursive call
    return qrPolynomial(num, 0).mod(e);
  };

  return _this;
};

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

const QRRSBlock = function() {

  const RS_BLOCK_TABLE = [

    // L
    // M
    // Q
    // H

    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],

    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],

    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],

    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],

    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],

    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],

    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],

    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],

    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],

    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],

    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],

    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],

    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],

    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],

    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],

    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],

    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],

    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],

    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],

    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],

    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],

    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],

    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],

    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],

    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],

    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],

    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],

    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],

    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],

    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],

    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],

    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],

    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],

    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],

    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],

    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],

    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],

    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],

    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],

    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16]
  ];

  const qrRSBlock = function(totalCount, dataCount) {
    const _this = {};
    _this.totalCount = totalCount;
    _this.dataCount = dataCount;
    return _this;
  };

  const _this = {};

  const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

    switch(errorCorrectionLevel) {
    case QRErrorCorrectionLevel.L :
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
    case QRErrorCorrectionLevel.M :
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
    case QRErrorCorrectionLevel.Q :
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
    case QRErrorCorrectionLevel.H :
      return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
    default :
      return undefined;
    }
  };

  _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

    const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

    if (typeof rsBlock == 'undefined') {
      throw 'bad rs block @ typeNumber:' + typeNumber +
          '/errorCorrectionLevel:' + errorCorrectionLevel;
    }

    const length = rsBlock.length / 3;

    const list = [];

    for (let i = 0; i < length; i += 1) {

      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];

      for (let j = 0; j < count; j += 1) {
        list.push(qrRSBlock(totalCount, dataCount) );
      }
    }

    return list;
  };

  return _this;
}();

//---------------------------------------------------------------------
// qrBitBuffer
//---------------------------------------------------------------------

const qrBitBuffer = function() {

  const _buffer = [];
  let _length = 0;

  const _this = {};

  _this.getBuffer = function() {
    return _buffer;
  };

  _this.getAt = function(index) {
    const bufIndex = Math.floor(index / 8);
    return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
  };

  _this.put = function(num, length) {
    for (let i = 0; i < length; i += 1) {
      _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
    }
  };

  _this.getLengthInBits = function() {
    return _length;
  };

  _this.putBit = function(bit) {

    const bufIndex = Math.floor(_length / 8);
    if (_buffer.length <= bufIndex) {
      _buffer.push(0);
    }

    if (bit) {
      _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
    }

    _length += 1;
  };

  return _this;
};

//---------------------------------------------------------------------
// qrNumber
//---------------------------------------------------------------------

const qrNumber = function(data) {

  const _mode = QRMode.MODE_NUMBER;
  const _data = data;

  const _this = {};

  _this.getMode = function() {
    return _mode;
  };

  _this.getLength = function(buffer) {
    return _data.length;
  };

  _this.write = function(buffer) {

    const data = _data;

    let i = 0;

    while (i + 2 < data.length) {
      buffer.put(strToNum(data.substring(i, i + 3) ), 10);
      i += 3;
    }

    if (i < data.length) {
      if (data.length - i == 1) {
        buffer.put(strToNum(data.substring(i, i + 1) ), 4);
      } else if (data.length - i == 2) {
        buffer.put(strToNum(data.substring(i, i + 2) ), 7);
      }
    }
  };

  const strToNum = function(s) {
    let num = 0;
    for (let i = 0; i < s.length; i += 1) {
      num = num * 10 + chatToNum(s.charAt(i) );
    }
    return num;
  };

  const chatToNum = function(c) {
    if ('0' <= c && c <= '9') {
      return c.charCodeAt(0) - '0'.charCodeAt(0);
    }
    throw 'illegal char :' + c;
  };

  return _this;
};

//---------------------------------------------------------------------
// qrAlphaNum
//---------------------------------------------------------------------

const qrAlphaNum = function(data) {

  const _mode = QRMode.MODE_ALPHA_NUM;
  const _data = data;

  const _this = {};

  _this.getMode = function() {
    return _mode;
  };

  _this.getLength = function(buffer) {
    return _data.length;
  };

  _this.write = function(buffer) {

    const s = _data;

    let i = 0;

    while (i + 1 < s.length) {
      buffer.put(
        getCode(s.charAt(i) ) * 45 +
        getCode(s.charAt(i + 1) ), 11);
      i += 2;
    }

    if (i < s.length) {
      buffer.put(getCode(s.charAt(i) ), 6);
    }
  };

  const getCode = function(c) {

    if ('0' <= c && c <= '9') {
      return c.charCodeAt(0) - '0'.charCodeAt(0);
    } else if ('A' <= c && c <= 'Z') {
      return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else {
      switch (c) {
      case '\u0020' : return 36;
      case '$' : return 37;
      case '%' : return 38;
      case '*' : return 39;
      case '+' : return 40;
      case '-' : return 41;
      case '.' : return 42;
      case '/' : return 43;
      case ':' : return 44;
      default :
        throw 'illegal char :' + c;
      }
    }
  };

  return _this;
};

//---------------------------------------------------------------------
// qr8BitByte
//---------------------------------------------------------------------

const qr8BitByte = function(data) {

  const _mode = QRMode.MODE_8BIT_BYTE;
  const _bytes = qrcode.stringToBytes(data);

  const _this = {};

  _this.getMode = function() {
    return _mode;
  };

  _this.getLength = function(buffer) {
    return _bytes.length;
  };

  _this.write = function(buffer) {
    for (let i = 0; i < _bytes.length; i += 1) {
      buffer.put(_bytes[i], 8);
    }
  };

  return _this;
};

//---------------------------------------------------------------------
// qrKanji
//---------------------------------------------------------------------

const qrKanji = function(data) {

  const _mode = QRMode.MODE_KANJI;

  const stringToBytes = qrcode.stringToBytes;
  !function(c, code) {
    // self test for sjis support.
    const test = stringToBytes(c);
    if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
      throw 'sjis not supported.';
    }
  }('\u53cb', 0x9746);

  const _bytes = stringToBytes(data);

  const _this = {};

  _this.getMode = function() {
    return _mode;
  };

  _this.getLength = function(buffer) {
    return ~~(_bytes.length / 2);
  };

  _this.write = function(buffer) {

    const data = _bytes;

    let i = 0;

    while (i + 1 < data.length) {

      let c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

      if (0x8140 <= c && c <= 0x9FFC) {
        c -= 0x8140;
      } else if (0xE040 <= c && c <= 0xEBBF) {
        c -= 0xC140;
      } else {
        throw 'illegal char at ' + (i + 1) + '/' + c;
      }

      c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

      buffer.put(c, 13);

      i += 2;
    }

    if (i < data.length) {
      throw 'illegal char at ' + (i + 1);
    }
  };

  return _this;
};

//=====================================================================
// GIF Support etc.
//

//---------------------------------------------------------------------
// byteArrayOutputStream
//---------------------------------------------------------------------

const byteArrayOutputStream = function() {

  const _bytes = [];

  const _this = {};

  _this.writeByte = function(b) {
    _bytes.push(b & 0xff);
  };

  _this.writeShort = function(i) {
    _this.writeByte(i);
    _this.writeByte(i >>> 8);
  };

  _this.writeBytes = function(b, off, len) {
    off = off || 0;
    len = len || b.length;
    for (let i = 0; i < len; i += 1) {
      _this.writeByte(b[i + off]);
    }
  };

  _this.writeString = function(s) {
    for (let i = 0; i < s.length; i += 1) {
      _this.writeByte(s.charCodeAt(i) );
    }
  };

  _this.toByteArray = function() {
    return _bytes;
  };

  _this.toString = function() {
    let s = '';
    s += '[';
    for (let i = 0; i < _bytes.length; i += 1) {
      if (i > 0) {
        s += ',';
      }
      s += _bytes[i];
    }
    s += ']';
    return s;
  };

  return _this;
};

//---------------------------------------------------------------------
// base64EncodeOutputStream
//---------------------------------------------------------------------

const base64EncodeOutputStream = function() {

  let _buffer = 0;
  let _buflen = 0;
  let _length = 0;
  let _base64 = '';

  const _this = {};

  const writeEncoded = function(b) {
    _base64 += String.fromCharCode(encode(b & 0x3f) );
  };

  const encode = function(n) {
    if (n < 0) {
      throw 'n:' + n;
    } else if (n < 26) {
      return 0x41 + n;
    } else if (n < 52) {
      return 0x61 + (n - 26);
    } else if (n < 62) {
      return 0x30 + (n - 52);
    } else if (n == 62) {
      return 0x2b;
    } else if (n == 63) {
      return 0x2f;
    } else {
      throw 'n:' + n;
    }
  };

  _this.writeByte = function(n) {

    _buffer = (_buffer << 8) | (n & 0xff);
    _buflen += 8;
    _length += 1;

    while (_buflen >= 6) {
      writeEncoded(_buffer >>> (_buflen - 6) );
      _buflen -= 6;
    }
  };

  _this.flush = function() {

    if (_buflen > 0) {
      writeEncoded(_buffer << (6 - _buflen) );
      _buffer = 0;
      _buflen = 0;
    }

    if (_length % 3 != 0) {
      // padding
      const padlen = 3 - _length % 3;
      for (let i = 0; i < padlen; i += 1) {
        _base64 += '=';
      }
    }
  };

  _this.toString = function() {
    return _base64;
  };

  return _this;
};

//---------------------------------------------------------------------
// base64DecodeInputStream
//---------------------------------------------------------------------

const base64DecodeInputStream = function(str) {

  const _str = str;
  let _pos = 0;
  let _buffer = 0;
  let _buflen = 0;

  const _this = {};

  _this.read = function() {

    while (_buflen < 8) {

      if (_pos >= _str.length) {
        if (_buflen == 0) {
          return -1;
        }
        throw 'unexpected end of file./' + _buflen;
      }

      const c = _str.charAt(_pos);
      _pos += 1;

      if (c == '=') {
        _buflen = 0;
        return -1;
      } else if (c.match(/^\s$/) ) {
        // ignore if whitespace.
        continue;
      }

      _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
      _buflen += 6;
    }

    const n = (_buffer >>> (_buflen - 8) ) & 0xff;
    _buflen -= 8;
    return n;
  };

  const decode = function(c) {
    if (0x41 <= c && c <= 0x5a) {
      return c - 0x41;
    } else if (0x61 <= c && c <= 0x7a) {
      return c - 0x61 + 26;
    } else if (0x30 <= c && c <= 0x39) {
      return c - 0x30 + 52;
    } else if (c == 0x2b) {
      return 62;
    } else if (c == 0x2f) {
      return 63;
    } else {
      throw 'c:' + c;
    }
  };

  return _this;
};

//---------------------------------------------------------------------
// gifImage (B/W)
//---------------------------------------------------------------------

const gifImage = function(width, height) {

  const _width = width;
  const _height = height;
  const _data = new Array(width * height);

  const _this = {};

  _this.setPixel = function(x, y, pixel) {
    _data[y * _width + x] = pixel;
  };

  _this.write = function(out) {

    //---------------------------------
    // GIF Signature

    out.writeString('GIF87a');

    //---------------------------------
    // Screen Descriptor

    out.writeShort(_width);
    out.writeShort(_height);

    out.writeByte(0x80); // 2bit
    out.writeByte(0);
    out.writeByte(0);

    //---------------------------------
    // Global Color Map

    // black
    out.writeByte(0x00);
    out.writeByte(0x00);
    out.writeByte(0x00);

    // white
    out.writeByte(0xff);
    out.writeByte(0xff);
    out.writeByte(0xff);

    //---------------------------------
    // Image Descriptor

    out.writeString(',');
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(_width);
    out.writeShort(_height);
    out.writeByte(0);

    //---------------------------------
    // Local Color Map

    //---------------------------------
    // Raster Data

    const lzwMinCodeSize = 2;
    const raster = getLZWRaster(lzwMinCodeSize);

    out.writeByte(lzwMinCodeSize);

    let offset = 0;

    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }

    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0x00);

    //---------------------------------
    // GIF Terminator
    out.writeString(';');
  };

  const bitOutputStream = function(out) {

    const _out = out;
    let _bitLength = 0;
    let _bitBuffer = 0;

    const _this = {};

    _this.write = function(data, length) {

      if ( (data >>> length) != 0) {
        throw 'length over';
      }

      while (_bitLength + length >= 8) {
        _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
        length -= (8 - _bitLength);
        data >>>= (8 - _bitLength);
        _bitBuffer = 0;
        _bitLength = 0;
      }

      _bitBuffer = (data << _bitLength) | _bitBuffer;
      _bitLength = _bitLength + length;
    };

    _this.flush = function() {
      if (_bitLength > 0) {
        _out.writeByte(_bitBuffer);
      }
    };

    return _this;
  };

  const getLZWRaster = function(lzwMinCodeSize) {

    const clearCode = 1 << lzwMinCodeSize;
    const endCode = (1 << lzwMinCodeSize) + 1;
    let bitLength = lzwMinCodeSize + 1;

    // Setup LZWTable
    const table = lzwTable();

    for (let i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i) );
    }
    table.add(String.fromCharCode(clearCode) );
    table.add(String.fromCharCode(endCode) );

    const byteOut = byteArrayOutputStream();
    const bitOut = bitOutputStream(byteOut);

    // clear code
    bitOut.write(clearCode, bitLength);

    let dataIndex = 0;

    let s = String.fromCharCode(_data[dataIndex]);
    dataIndex += 1;

    while (dataIndex < _data.length) {

      const c = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      if (table.contains(s + c) ) {

        s = s + c;

      } else {

        bitOut.write(table.indexOf(s), bitLength);

        if (table.size() < 0xfff) {

          if (table.size() == (1 << bitLength) ) {
            bitLength += 1;
          }

          table.add(s + c);
        }

        s = c;
      }
    }

    bitOut.write(table.indexOf(s), bitLength);

    // end code
    bitOut.write(endCode, bitLength);

    bitOut.flush();

    return byteOut.toByteArray();
  };

  const lzwTable = function() {

    const _map = {};
    let _size = 0;

    const _this = {};

    _this.add = function(key) {
      if (_this.contains(key) ) {
        throw 'dup key:' + key;
      }
      _map[key] = _size;
      _size += 1;
    };

    _this.size = function() {
      return _size;
    };

    _this.indexOf = function(key) {
      return _map[key];
    };

    _this.contains = function(key) {
      return typeof _map[key] != 'undefined';
    };

    return _this;
  };

  return _this;
};

const createDataURL = function(width, height, getPixel) {
  const gif = gifImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gif.setPixel(x, y, getPixel(x, y) );
    }
  }

  const b = byteArrayOutputStream();
  gif.write(b);

  const base64 = base64EncodeOutputStream();
  const bytes = b.toByteArray();
  for (let i = 0; i < bytes.length; i += 1) {
    base64.writeByte(bytes[i]);
  }
  base64.flush();

  return 'data:image/gif;base64,' + base64;
};

qrcode.stringToBytes;

const QR_QUIET_ZONE = 4;
function qrMatrix(text, ecc = "M") {
  for (let version = 1; version <= 40; version += 1) {
    try {
      const qr = qrcode(version, ecc);
      qr.addData(text, "Byte");
      qr.make();
      return {
        size: qr.getModuleCount(),
        text,
        version,
        get: (row, col) => qr.isDark(row, col)
      };
    } catch {
    }
  }
  throw new Error("The link is too long to encode as a QR code");
}
const QR_PRINT = {
  symbolMm: 20,
  /** A module narrower than this is not reliably readable in print. */
  minModuleMm: 0.55,
  /** 4 modules at version 4 = 2.4 mm; the spec's minimum. */
  minQuietMm: 2.4
};
function qrGeometry(matrix, symbolMm = QR_PRINT.symbolMm) {
  const moduleMm = symbolMm / matrix.size;
  const quietMm = moduleMm * QR_QUIET_ZONE;
  return { symbolMm, moduleMm, quietMm, blockMm: symbolMm + quietMm * 2 };
}
function qrSelfCheck(matrix, expected, printed) {
  if (matrix.text !== expected) return { ok: false, reason: "payload differs from the saved short link" };
  if (!expected.startsWith("https://")) return { ok: false, reason: "the link is not an absolute https URL" };
  if (matrix.size > 33) return { ok: false, reason: `version ${matrix.version ?? "?"} is denser than version 4` };
  if (matrix.size < 21) return { ok: false, reason: "the symbol is too small to be valid" };
  if (printed?.symbolMm) {
    const g = qrGeometry(matrix, printed.symbolMm);
    if (g.moduleMm < QR_PRINT.minModuleMm)
      return {
        ok: false,
        reason: `${g.moduleMm.toFixed(2)} mm modules at ${g.symbolMm} mm is below the ${QR_PRINT.minModuleMm} mm print minimum`
      };
    if (g.quietMm < QR_PRINT.minQuietMm)
      return {
        ok: false,
        reason: `quiet zone ${g.quietMm.toFixed(2)} mm is below 4 modules`
      };
  }
  return { ok: true, reason: "" };
}
async function decodePrintedQr(matrix, symbolMm = QR_PRINT.symbolMm, dpi = 150) {
  const jsQR = (await __vitePreload(async () => { const {default: __vite_default__} = await import('./jsQR-CrbJUbWv.js').then(n => n.j);return { default: __vite_default__ }},true              ?__vite__mapDeps([0,1]):void 0)).default;
  const quiet = QR_QUIET_ZONE;
  const totalModules = matrix.size + quiet * 2;
  const px = Math.max(64, Math.round(symbolMm / 25.4 * dpi));
  const scale = px / totalModules;
  const side = Math.ceil(totalModules * scale);
  const data = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const col = Math.floor(x / scale) - quiet;
      const row = Math.floor(y / scale) - quiet;
      const dark = col >= 0 && row >= 0 && col < matrix.size && row < matrix.size ? matrix.get(row, col) : false;
      const i = (y * side + x) * 4;
      data[i] = dark ? 0 : 255;
      data[i + 1] = dark ? 0 : 255;
      data[i + 2] = dark ? 0 : 255;
      data[i + 3] = 255;
    }
  }
  return jsQR(data, side, side)?.data ?? null;
}
function darkRuns(m) {
  const runs = [];
  for (let row = 0; row < m.size; row += 1) {
    let start = -1;
    for (let col = 0; col < m.size; col += 1) {
      const dark = m.get(row, col);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        runs.push({ row, start, length: col - start });
        start = -1;
      }
    }
    if (start >= 0) runs.push({ row, start, length: m.size - start });
  }
  return runs;
}
function drawQr(doc, matrix, x, y, sizeMm) {
  const total = matrix.size + QR_QUIET_ZONE * 2;
  const unit = sizeMm / total;
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, sizeMm, sizeMm, "F");
  doc.setFillColor(0, 0, 0);
  for (const run of darkRuns(matrix)) {
    doc.rect(
      x + (run.start + QR_QUIET_ZONE) * unit,
      y + (run.row + QR_QUIET_ZONE) * unit,
      run.length * unit,
      unit,
      "F"
    );
  }
}

const SHEET = {
  pageW: 210,
  pageH: 297,
  margin: 10,
  bottom: 12,
  colW: 92,
  gap: 6,
  content: 190,
  body: 8.5,
  label: 8,
  min: 7.5,
  rowMin: 5.5,
  cardHeader: 6
};
const COLUMN_X = { left: SHEET.margin, right: SHEET.margin + SHEET.colW + SHEET.gap };
const SHEET_BODY = {
  top1: 86,
  top2: 22,
  bottom: SHEET.pageH - SHEET.bottom,
  // 285 mm
  /** Page 1 content box: 199 mm (the old failure said "223.3/199mm"). */
  cap1: SHEET.pageH - SHEET.bottom - 86,
  /** Page 2 content box before the tail (Remarks + Recent changes). */
  cap2: SHEET.pageH - SHEET.bottom - 22,
  /** Vertical gap between packed cards (constant, 3 mm). */
  cardGap: 3,
  /** Two columns that end further apart than this get rebalanced. */
  balanceMm: 10
};
const SHEET_FONT = "SheetSans";
let sheetFonts = null;
async function fontBase64(file) {
  const toB64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }
    return btoa(bin);
  };
  const bun = globalThis.Bun;
  if (bun) {
    return toB64(await bun.file(`public/fonts/${file}`).arrayBuffer());
  }
  if (typeof document !== "undefined" && typeof fetch === "function") {
    const res = await fetch(`/fonts/${file}`);
    if (!res.ok) throw new Error(`The sheet font ${file} could not be loaded`);
    return toB64(await res.arrayBuffer());
  }
  throw new Error(`The sheet font ${file} could not be loaded in this runtime`);
}
async function loadSheetFonts() {
  if (sheetFonts) return sheetFonts;
  const [regular, bold] = await Promise.all([
    fontBase64("NotoSansTamil-RegularMerged.ttf"),
    fontBase64("NotoSansTamil-Bold.ttf")
  ]);
  sheetFonts = { regular, bold };
  return sheetFonts;
}
function installSheetFonts(doc, fonts) {
  doc.addFileToVFS("NQAS-Sheet-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NQAS-Sheet-Bold.ttf", fonts.bold);
  doc.addFont("NQAS-Sheet-Regular.ttf", SHEET_FONT, "normal");
  doc.addFont("NQAS-Sheet-Regular.ttf", SHEET_FONT, "italic");
  doc.addFont("NQAS-Sheet-Bold.ttf", SHEET_FONT, "bold");
  doc.addFont("NQAS-Sheet-Bold.ttf", SHEET_FONT, "bolditalic");
}
const SHEET_CHAR_MAP = {
  "→": "to",
  // U+2192 — not in the embedded faces
  "←": "from",
  "–": "-",
  // en dash
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "✓": "Yes",
  "✔": "Yes",
  "✗": "No",
  "✕": "x",
  "▲": "+",
  "▼": "-",
  "■": "=",
  "□": "",
  "•": "-"
};
function mapSheetChars(text) {
  let out = "";
  for (const ch of text) out += SHEET_CHAR_MAP[ch] ?? ch;
  return out;
}
function sheetText(value) {
  if (value == null) return "";
  const normalised = String(value).replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(/\u00a0/g, " ");
  return mapSheetChars(normalised).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "");
}
function covered(ch) {
  const code = ch.codePointAt(0) ?? 0;
  if (code === 10) return true;
  if (code >= 32 && code <= 127) return true;
  if (code >= 160 && code <= 255) return true;
  if (code === 8377) return true;
  if (code === 8226 || code === 8230 || code === 8211 || code === 8212) return true;
  if (code === 8216 || code === 8217 || code === 8220 || code === 8221) return true;
  if (code >= 2944 && code <= 3071) return true;
  return false;
}
function isSheetSafe(text) {
  return Array.from(sheetText(text)).every(covered);
}
function unsupportedSheetGlyphs(...texts) {
  const bad = /* @__PURE__ */ new Set();
  for (const text of texts) {
    for (const ch of Array.from(sheetText(text ?? ""))) {
      if (!covered(ch)) bad.add(ch);
    }
  }
  return [...bad];
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function istStamp(t = /* @__PURE__ */ new Date()) {
  const ist = new Date(t.getTime() + 5.5 * 36e5);
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(
    ist.getUTCHours()
  ).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
}
const DASH = "—";
const money = (v) => v == null || v === "" || Number.isNaN(Number(v)) || Number(v) === 0 ? "" : formatInr(Number(v));
function sheetScoreRow(label, value, bands) {
  if (value == null) return { kind: "kv", label, value: "-" };
  const band = scoreBandFor(value, bands);
  return {
    kind: "kv",
    label,
    value: scoreText(value),
    bar: { value, tone: band?.tone ?? "teal" }
  };
}
function scoreText(v) {
  return v == null || Number.isNaN(v) ? "" : `${v.toFixed(SCORE_DECIMALS)}%`;
}
function assessmentScoreText(v) {
  return v == null || Number.isNaN(v) || v <= 0 ? "" : scoreText(v);
}
const daysBetweenIso = (a, b) => {
  if (!a || !b) return null;
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 864e5) + 1;
};
function dateRangePlain(from, to) {
  const a = toDdMmmYyyy(from);
  const b = toDdMmmYyyy(to);
  if (!a && !b) return "";
  if (!b || a === b) return a || b;
  return `${a} to ${b}`;
}
function durationText(from, to) {
  const a = toDdMmmYyyy(from);
  if (!a) return "";
  const n = daysBetweenIso(from, to || from);
  if (n == null || n <= 0) return "";
  return `${n} day${n === 1 ? "" : "s"}`;
}
function dateRangeText(from, to) {
  const range = dateRangePlain(from, to);
  if (!range || !from || !to || toDdMmmYyyy(from) === toDdMmmYyyy(to)) return range;
  const days = durationText(from, to);
  return days ? `${range} - ${days}` : range;
}
const clean = (v) => sheetText(v ?? "").trim();
const or = (v, fallback = DASH) => clean(v) || fallback;
const SHEET_DOCUMENTS = [
  { key: "NQAS_Result", label: "NQAS Result" },
  { key: "SA_Report", label: "SA Report" },
  { key: "SA_Checklist", label: "SA Checklist" },
  { key: "Gap_Closure", label: "Gap Closure Proceeding" },
  { key: "Condemned", label: "Condemned Certificate" },
  { key: "NOC", label: "Fire NOC" }
];
const NOC_DISPLAY = {
  Valid: "Valid",
  "Expiring Soon": "Expiring soon",
  Expired: "Expired",
  "Not Obtained": "Not recorded"
};
function nqasVisitInput(n) {
  if (!n) return null;
  const opt = (v) => v ?? void 0;
  return {
    status: n.status ?? "",
    scheduledStartDate: opt(n.scheduledStartDate),
    scheduledEndDate: opt(n.scheduledEndDate),
    actualStartDate: opt(n.actualStartDate),
    actualEndDate: opt(n.actualEndDate),
    certificationStatus: opt(n.certificationStatus),
    certificationDate: opt(n.certificationDate),
    goiLetterDate: opt(n.goiLetterDate),
    validityDate: opt(n.validityDate),
    surveillanceDue1: n.surveillanceDue1,
    surveillanceDue2: n.surveillanceDue2,
    surveillanceDone1: n.surveillanceDone1,
    surveillanceDone2: n.surveillanceDone2
  };
}
const stageTone = (state) => state === "current" ? "blue" : state === "done" ? "green" : state === "blocked" ? "red" : "grey";
function recertChip(nqas, today) {
  if (!nqas?.certificationDate && !nqas?.certificationStatus) {
    return { text: "Not certified yet", tone: "grey" };
  }
  const validity = clean(nqas?.validityDate);
  if (validity) {
    const left = daysBetweenIso(today, validity);
    if (left == null) return { text: "Not due yet", tone: "green" };
    if (left < 0) return { text: "Overdue", tone: "red" };
    if (left <= 90) return { text: `Due ${validity.slice(0, 4)}`, tone: "amber" };
    return { text: "Not due yet", tone: "green" };
  }
  if (nqas?.recertStatus) {
    const s = clean(nqas.recertStatus);
    if (/overdue|expired/i.test(s)) return { text: "Overdue", tone: "red" };
    if (/due/i.test(s)) return { text: "Due", tone: "amber" };
    if (/process|progress|scheduled/i.test(s)) return { text: "In progress", tone: "blue" };
  }
  return { text: "Not due yet", tone: "green" };
}
const AUDIT_LABELS = {
  scheduledStartDate: "NQAS scheduled start date",
  scheduledEndDate: "NQAS scheduled end date",
  actualStartDate: "NQAS actual start date",
  actualEndDate: "NQAS actual end date",
  surveillanceDone1: "1st surveillance done date",
  surveillanceDone2: "2nd surveillance done date",
  surveillanceDue1: "1st surveillance due date",
  surveillanceDue2: "2nd surveillance due date",
  certificationStatus: "Certification status",
  certificationDate: "Certification date",
  validityDate: "Certificate validity",
  scorePercent: "Score",
  generalDocStatus: "SaQsham document status",
  documentsStatusReport: "Documents status (report)",
  buildingStatus: "Building status",
  nocAvailable: "Fire NOC available",
  expiryDate: "Fire NOC expiry",
  amountSanctioned: "Gap closure sanctioned",
  currentStatus: "Facility status",
  status: "Status"
};
const DOC_AUDIT_LABELS = Object.fromEntries(
  SHEET_DOCUMENTS.map((d) => [d.key, d.label])
);
function prettyField(field) {
  const raw = clean(field);
  if (!raw) return "";
  const doc = DOC_AUDIT_LABELS[raw];
  if (doc) return doc;
  const direct = AUDIT_LABELS[raw];
  if (direct) return direct;
  if (raw.includes(" ")) return raw;
  const words = raw.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
const FILE_VALUE = /(^|[\\/])[^\\/]+\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|zip|csv|txt)\s*$/i;
function auditValue(value) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  const s = clean(value);
  if (FILE_VALUE.test(s)) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return toDdMmmYyyy(s);
  const iso = /^(\d{4}-\d{2}-\d{2})[ T]/.exec(s);
  if (iso) return toDdMmmYyyy(iso[1]);
  return s.length > 90 ? `${s.slice(0, 88)}…` : s;
}
const DATE_AUDIT_FIELDS = /* @__PURE__ */ new Set([
  "scheduledStartDate",
  "scheduledEndDate",
  "actualStartDate",
  "actualEndDate",
  "scheduledDate",
  "revisedDate",
  "certificationDate",
  "goiLetterDate",
  "validityDate",
  "surveillanceDue1",
  "surveillanceDue2",
  "surveillanceDone1",
  "surveillanceDone2",
  "issuedDate",
  "expiryDate"
]);
function noisyAudit(a) {
  const table = (a.table ?? "").toLowerCase();
  const field = (a.field ?? "").toLowerCase();
  return a.action === "view" || table.includes("share") || table.includes("session") || field.includes("share") || field.includes("token") || field === "driveconnection";
}
function auditLine(a, cycleLabel) {
  const raw = clean(a.field);
  const docLabel = DOC_AUDIT_LABELS[raw];
  const cycle = cycleLabel ? ` (${cycleLabel})` : "";
  if (docLabel) {
    if (a.action === "create") return `Uploaded ${docLabel}${cycle}`;
    if (a.action === "delete") return `Removed ${docLabel}${cycle}`;
    return `Updated ${docLabel}${cycle}`;
  }
  if (!docLabel && /attach|document|file|photo|image|drive/i.test(raw)) {
    if (a.action === "create") return `Uploaded a document${cycle}`;
    if (a.action === "delete") return `Removed a document${cycle}`;
    return `Updated a document${cycle}`;
  }
  const field = prettyField(raw);
  const value = auditValue(a.newValue);
  if (field) {
    if (value && (DATE_AUDIT_FIELDS.has(raw) || /date|validity|due|done/i.test(field) && /^\d{2}-/.test(value)))
      return `Changed ${field} to ${value}`;
    return value ? `${field} set to ${value}` : `${field} updated`;
  }
  const action = a.action === "create" ? "Facility record created" : a.action === "delete" ? "Record removed" : "Updated";
  return value ? `${action}${cycle}: ${value}` : `${action}${cycle}`;
}
function iaChartFor(iaq, options = {}) {
  const empty = {
    points: [],
    note: "No internal assessment scores reported",
    change: { nqas: null, kayakalp: null }
  };
  if (!iaq) return empty;
  const scored = iaq.rows.filter((r) => r.nqasIaScore != null || r.kayakalpIaScore != null).sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
  if (scored.length === 0) return empty;
  const latest = scored[scored.length - 1];
  const latestPeriod = { fy: latest.fy, q: latest.quarter };
  const anchor = options.endPeriod ?? latestPeriod;
  let periods = lastQuarters(anchor.fy, anchor.q, 4);
  const hasData = (list) => list.some((p) => iaScoreOf(iaq, "nqas", p) != null || iaScoreOf(iaq, "kayakalp", p) != null);
  if (!hasData(periods)) periods = lastQuarters(latest.fy, latest.quarter, 4);
  const points = periods.map((p) => {
    const nqas = iaScoreOf(iaq, "nqas", p);
    const kayakalp = iaScoreOf(iaq, "kayakalp", p);
    return {
      fy: p.fy,
      q: p.q,
      label: `Q${p.q} ${p.fy}`,
      shortLabel: `Q${p.q} ${p.fy.slice(2)}`,
      nqas,
      kayakalp,
      reported: nqas != null || kayakalp != null
    };
  });
  const reported = points.filter((p) => p.reported).length;
  const prev = points[points.length - 2] ?? null;
  const last = points[points.length - 1] ?? null;
  const factor = 10 ** SCORE_DECIMALS;
  const diff = (a, b) => a == null || b == null ? null : Math.round((b - a) * factor) / factor;
  const note = reported === 0 ? "No quarter reported in this window" : reported === 1 ? "Only 1 quarter reported" : "";
  return {
    points,
    note,
    change: {
      nqas: diff(prev?.nqas, last?.nqas),
      kayakalp: diff(prev?.kayakalp, last?.kayakalp)
    }
  };
}
function changeMark(value) {
  if (value == null || Number.isNaN(value)) return null;
  if (Math.abs(value) < 0.05) return "flat";
  return value > 0 ? "up" : "down";
}
function fyQuarterOf(iso) {
  const text = clean(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return null;
  const q = Math.floor((month + 8) % 12 / 3) + 1;
  const fyStart = month >= 4 ? year : year - 1;
  return { fy: `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`, q };
}
function cycleEndIso(record) {
  const q = record.nqas ?? null;
  const sa = record.sa ?? null;
  return clean(q?.goiLetterDate) || clean(q?.certificationDate) || clean(q?.actualEndDate) || clean(sa?.actualEndDate) || clean(q?.validityDate) || clean(q?.scheduledEndDate);
}
function cycleStartIso(record) {
  const sa = record.sa ?? null;
  const q = record.nqas ?? null;
  return clean(record.startedOn) || clean(sa?.actualStartDate) || clean(sa?.scheduledDate) || clean(q?.scheduledStartDate);
}
function buildSheetModel(row, opts = {}) {
  const f = row.facility;
  const sa = row.sa ?? null;
  const nqas = row.nqas ?? null;
  const iaq = row.iaq ?? null;
  const fund = row.fund ?? null;
  const noc = row.noc ?? null;
  const building = row.building ?? null;
  const scores = row.scores ?? null;
  const scoreBands = readScoreBands(
    opts.settings?.scoreBands
  );
  const cycleNo = row.cycleNumber ?? 1;
  const cycleType = clean(row.cycleType) || (cycleNo > 1 ? "Recertification" : "Initial");
  const cycleInfo = opts.cycle;
  const isCurrentCycle = cycleInfo?.current ?? true;
  const cycleTag = isCurrentCycle ? "CURRENT" : "AS RECORDED";
  const supersededBy = cycleInfo?.supersededBy ?? null;
  const cycleHeading = `CYCLE #${cycleNo} · ${cycleType.toUpperCase()} · ${isCurrentCycle ? "CURRENT" : supersededBy ? `SUPERSEDED BY CYCLE #${supersededBy}` : cycleInfo?.closedOn ? `CLOSED ${toDdMmmYyyy(cycleInfo.closedOn).toUpperCase()}` : "AS RECORDED"}`;
  const cycleStartLabel = cycleInfo?.startedOn ? `Started ${toDdMmmYyyy(cycleInfo.startedOn)}` : "Start not recorded";
  const reportId = opts.reportId ?? `NQAS-${clean(f.ninNumber) || "NO-NIN"}-C${cycleNo}`;
  const stamp = istStamp(opts.generatedAt);
  const dataAsOf = opts.dataAsOf ? istStamp(new Date(opts.dataAsOf)) : istStamp(opts.generatedAt ?? /* @__PURE__ */ new Date());
  const settings = { ...DEFAULT_SETTINGS, ...opts.settings ?? {} };
  const today = opts.today ?? todayIso();
  daysUntil(nqas?.validityDate ?? null, /* @__PURE__ */ new Date(`${today}T12:00:00Z`));
  const stageLabel = clean(f.currentStatus) || "Not started";
  const pair = iaq?.pair ?? { previous: { fy: "", q: 1 }, current: { fy: "", q: 2 } };
  const iaValue = (tracker, which) => iaq ? iaScoreOf(iaq, tracker, pair[which]) : null;
  const iaLatest = (tracker) => iaValue(tracker, "current") ?? (tracker === "nqas" ? f.nqasIaQ2 ?? null : f.kayakalpIaQ2 ?? null);
  const hasKeyList = Array.isArray(row.docs?.keys);
  const presentKeys = new Set(
    (row.docs?.keys ?? []).map((k) => k === "NQAS_Certificate" ? "NQAS_Result" : k)
  );
  const requiredMissingDocs = row.docs?.requiredMissing ?? (row.docs?.keys ? requiredDocumentsMissing(row) : []);
  const requiredKeys = new Set(requiredMissingDocs.map((d) => d.key));
  const legacyHas = (key) => {
    switch (key) {
      case "NQAS_Result":
        return !!clean(row.resultDocumentName);
      case "SA_Report":
        return !!clean(sa?.reportAttachmentName);
      case "SA_Checklist":
        return !!clean(sa?.checklistAttachmentName);
      case "Gap_Closure":
        return !!clean(fund?.procLink) || !!clean(fund?.fundAttachmentName);
      case "Condemned":
        return !!clean(building?.condemnedLink) || !!clean(building?.condemnedAttachmentName);
      case "NOC":
        return !!clean(noc?.nocAttachmentName ?? noc?.nocLink);
      default:
        return false;
    }
  };
  const documents = SHEET_DOCUMENTS.map((d) => {
    const has = hasKeyList ? presentKeys.has(d.key) : legacyHas(d.key);
    const requirement = row.docs?.requirements?.[d.key];
    const required = requirement?.required === true || requiredKeys.has(d.key);
    const badge = required ? requirement?.badge ?? "Required" : "";
    const file = row.docs?.files?.[d.key] ?? null;
    return {
      ...d,
      badge,
      required,
      has,
      file,
      url: opts.docLinks?.[`${cycleNo}:${d.key}`] ?? null,
      requiredMissing: required && !has,
      /* PDF only: the date and the Open action, NEVER the file name (Part 3).
         Quick View, Profile and the Excel profile keep their file names. */
      value: has ? `Uploaded${file?.uploadedAt ? ` ${toDdMmmYyyy(file.uploadedAt)}` : ""}` : required ? "Required missing" : "Not uploaded"
    };
  });
  const nocValidityRaw = deriveFireNocStatus(
    clean(noc?.nocAvailable) || null,
    clean(noc?.expiryDate) || null,
    clean(noc?.status) || null,
    today
  );
  const nocValidity = NOC_DISPLAY[nocValidityRaw] ?? (clean(nocValidityRaw) || "Not recorded");
  const buildingStatus = building?.buildingStatus ? buildingBucketOf(building.buildingStatus) : "";
  const visits = surveillanceVisits(nqasVisitInput(nqas), opts.settings ?? null, today);
  const visitDone = (v) => v.validDone ? `Done ${formatVisitDate(v.validDone)}` : "Not done";
  const futureDone = (key, done) => {
    const d = clean(done).slice(0, 10);
    return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d > today ? `${key} surveillance done date is in the future; confirm in Admin > Data checks` : "";
  };
  const checks = [];
  for (const doc of requiredMissingDocs) {
    checks.push(`${doc.label} document not uploaded (required)`);
  }
  const future1 = futureDone("1st", nqas?.surveillanceDone1);
  const future2 = futureDone("2nd", nqas?.surveillanceDone2);
  if (future1) checks.push(future1);
  if (future2) checks.push(future2);
  const documentsReport = clean(f.documentsStatusReport);
  const portalStatus = clean(sa?.generalDocStatus);
  if (nqas?.certificationStatus && /awaiting|pending/i.test(portalStatus)) {
    checks.push("Certified, but the documents status still says results are awaited");
  }
  if (!documentsReport && portalStatus) {
    checks.push("Documents Status (Report) is blank while a portal status exists");
  }
  if ((iaq?.rows.length ?? 0) > 0 && iaLatest("nqas") == null && iaLatest("kayakalp") == null) {
    checks.push("IA imports exist for this facility but no IA score is mapped");
  }
  if (clean(noc?.nocAvailable) === "Yes" && /expired/i.test(nocValidity)) {
    checks.push("NOC marked available but the expiry date has passed");
  }
  if (clean(noc?.nocAvailable) === "No" && nocValidity === "Valid") {
    checks.push("NOC Available says No while a valid expiry date is recorded");
  }
  if (nqas?.certificationStatus && !nqas.validityDate) {
    checks.push("Certified without a certificate validity date");
  }
  if (!clean(f.ninNumber)) checks.push("NIN is not recorded");
  if (nqas?.status === "Completed" && !assessmentScoreText(nqas?.scorePercent ?? null))
    checks.push("NQAS assessment completed without a score");
  if (sa?.status === "Completed" && !assessmentScoreText(sa?.scorePercent ?? null))
    checks.push("State assessment completed without a score");
  const certStatus = clean(nqas?.certificationStatus);
  const isDeferred = certStatus === "Deferred";
  const isConditional = certStatus === "Quality Certified with Conditionality";
  const certAnchor = clean(nqas?.goiLetterDate) || clean(nqas?.certificationDate) || clean(nqas?.actualEndDate);
  const coolingEnd = isDeferred && certAnchor ? addMonthsToIso(certAnchor, settings.deferredCooldownMonths) : "";
  const coolingDays = coolingEnd ? daysUntil(coolingEnd, /* @__PURE__ */ new Date(`${today}T12:00:00Z`)) : null;
  const coolingText = coolingEnd ? `Cooling period ends ${toDdMmmYyyy(coolingEnd)}${coolingDays != null && coolingDays >= 0 ? ` (${coolingDays} day${coolingDays === 1 ? "" : "s"})` : ""}` : "Cooling period ends: not recorded";
  const certificationRows = isDeferred ? [
    { kind: "pill", label: "Status", value: certStatus, tone: "red" },
    { kind: "kv", label: "Result (GoI letter) date", value: toDdMmmYyyy(certAnchor) },
    { kind: "kv", label: "Cooling period ends", value: toDdMmmYyyy(coolingEnd) }
  ] : isConditional ? [
    { kind: "pill", label: "Status", value: certStatus, tone: "amber" },
    { kind: "kv", label: "Certified on", value: toDdMmmYyyy(nqas?.certificationDate ?? certAnchor) },
    { kind: "kv", label: "Conditionality review by", value: toDdMmmYyyy(nqas?.validityDate) },
    { kind: "kv", label: "GoI letter date", value: toDdMmmYyyy(nqas?.goiLetterDate) }
  ] : [
    {
      kind: "pill",
      label: "Status",
      value: certStatus || "Not certified",
      tone: certStatus ? "green" : "grey"
    },
    { kind: "kv", label: "Certified on", value: toDdMmmYyyy(nqas?.certificationDate ?? certAnchor) },
    { kind: "kv", label: "Valid till", value: toDdMmmYyyy(nqas?.validityDate) },
    { kind: "kv", label: "GoI letter date", value: toDdMmmYyyy(nqas?.goiLetterDate) }
  ];
  const assessors = [
    { name: sa?.assessor1Name, hud: sa?.assessor1Hud, phone: sa?.assessor1Phone },
    { name: sa?.assessor2Name, hud: sa?.assessor2Hud, phone: sa?.assessor2Phone }
  ].map((a, i) => ({
    label: `Assessor ${i + 1}`,
    value: [
      assessorLine(a.name, a.hud),
      // Privacy: the contact number prints only on request.
      opts.includeContactNumbers && a.phone ? phoneForViewer(a.phone, true) : ""
    ].filter(Boolean).join(" · ")
  })).filter((a) => a.value);
  const kpiFacts = () => {
    const tiles = [
      { label: "NQAS status", value: or(nqas?.certificationStatus, "Not certified") },
      {
        // A closed cycle never shows a future date as if it were due: it
        // shows what was RECORDED (Part 2), and the future-Done rule below
        // applies to both.
        label: isCurrentCycle ? "Next surveillance" : "1st surveillance",
        value: isCurrentCycle ? toDdMmmYyyy(nqas?.surveillanceDue1 ?? null) || DASH : visits[0] && visits[0].validDone ? `Done ${formatVisitDate(visits[0].validDone)}` : nqas?.surveillanceDue1 ? `Not done (due ${toDdMmmYyyy(nqas.surveillanceDue1)})` : "Not scheduled"
      },
      { label: "Gap funds", value: money(fund?.amountSanctioned) || DASH },
      {
        label: "Fire NOC",
        value: nocValidity,
        tone: /expired/i.test(nocValidity) ? "red" : /valid/i.test(nocValidity) ? "green" : "grey"
      },
      {
        label: "Documents",
        value: `${documents.filter((d) => d.has).length} of ${documents.length}`
      },
      {
        label: "NQAS IA (latest)",
        value: scoreText(iaLatest("nqas")) || DASH
      }
    ];
    return tiles.map((t) => ({ ...t, value: sheetText(t.value) }));
  };
  const card = (id, title, hex, rows, fallback) => {
    const present = [];
    const missing = [];
    for (const r of rows) {
      if (r.kind === "mini") {
        present.push(r);
        continue;
      }
      const v = clean(r.value);
      if (!v || v === DASH) {
        if (r.label) missing.push(r.label);
        continue;
      }
      present.push({ ...r, value: v });
    }
    if (present.length === 0) {
      present.push({
        kind: "kv",
        value: clean(fallback) || (missing.length ? `Not recorded: ${missing.join(", ")}` : "Not recorded"),
        muted: true
      });
      missing.length = 0;
    }
    return { id, title, hex, rows: present, missing };
  };
  const recert = recertChip(nqas, today);
  const nqasScore = assessmentScoreText(nqas?.scorePercent ?? null);
  const departments = (nqas?.departments ?? []).map((d) => clean(d)).filter(Boolean);
  const departmentOptions = departmentsForFacility(
    f.facilityType,
    (nqas?.departmentOptions ?? []).map((d) => clean(d)).filter(Boolean),
    (nqas?.departmentOptions ?? []).map((d) => clean(d)).filter(Boolean)
  );
  const departmentsTotal = Math.max(
    nqas?.departmentsTotal ?? 0,
    departmentOptions.length,
    departments.length
  );
  const departmentWord = departmentNoun(f.facilityType);
  const unassessed = departments.length ? departmentOptions.filter((d) => !departments.includes(d)) : [];
  if (!departmentOptions.length && nqas?.departmentsTotal) {
    for (let i = departments.length; i < departmentsTotal; i += 1) unassessed.push(`Package ${i + 1}`);
  }
  const visitRange = dateRangePlain(nqas?.actualStartDate, nqas?.actualEndDate);
  const scheduledRange = dateRangePlain(nqas?.scheduledStartDate, nqas?.scheduledEndDate);
  const visitDuration = durationText(nqas?.actualStartDate, nqas?.actualEndDate);
  const nqasResultDoc = documents.find((d) => d.key === "NQAS_Result");
  const nqasResultValue = rowsResultDocument(row, nqasResultDoc);
  const page1Left = [
    card("identity", "Identity", "#0369a1", [
      { kind: "kv", label: "Facility", value: f.name },
      { kind: "kv", label: "NIN", value: clean(f.ninNumber) },
      { kind: "kv", label: "Type", value: f.facilityType },
      { kind: "kv", label: "Block", value: f.block },
      { kind: "kv", label: "PHC", value: f.phc },
      { kind: "kv", label: "SaQsham category", value: clean(f.saqshamCategory) }
    ]),
    /* Outcome only: assessment mode and score live in the NQAS Assessment
       Details card below; a Deferred result prints its cooling-period labels. */
    card("nqas", "NQAS Certification", "#047857", certificationRows),
    card(
      "nqasDetails",
      "NQAS Assessment Details",
      "#0f766e",
      [
        { kind: "kv", label: "NQAS assessment status", value: clean(nqas?.status) },
        { kind: "kv", label: "Scheduled dates", value: scheduledRange },
        { kind: "kv", label: "Visit (actual) dates", value: visitRange },
        { kind: "kv", label: "Duration", value: visitDuration },
        { kind: "kv", label: "Mode of assessment", value: clean(nqas?.mode) },
        { kind: "kv", label: "Checklist version", value: clean(nqas?.checklistVersion) },
        {
          kind: "kv",
          label: "Assessment score",
          // A missing score is a dash, never 0.00%; the data check still fires.
          value: nqasScore || "-",
          muted: !nqasScore
        },
        {
          kind: "kv",
          label: departmentWord === "service packages" ? "Service packages assessed" : "Departments assessed",
          value: departments.length ? `${departments.length} of ${departmentsTotal} ${departmentWord} assessed` : ""
        },
        ...unassessed.length ? [
          {
            kind: "kv",
            label: "Not assessed",
            value: unassessed.join(", "),
            muted: true
          }
        ] : [],
        {
          kind: "kv",
          label: "NQAS Result document",
          value: nqasResultValue,
          muted: !nqasResultDoc?.has
        }
      ],
      "Not recorded: NQAS assessment details"
    )
  ];
  const page1Right = [
    card("status", "Eligibility & Status", "#3730a3", [
      { kind: "kv", label: "Eligibility", value: clean(f.eligibility) },
      { kind: "pill", label: "Facility Current Status", value: stageLabel, tone: stageTone(stageLabel) },
      { kind: "kv", label: "Cycle", value: `#${cycleNo} ${cycleType}` },
      { kind: "kv", label: "Phase type", value: clean(f.phaseType) }
    ]),
    card("sa", "State Assessment", "#0d9488", [
      { kind: "kv", label: "Status", value: clean(sa?.status) },
      { kind: "kv", label: "Score", value: assessmentScoreText(sa?.scorePercent) },
      {
        kind: "kv",
        label: "SaQsham Documents Status",
        value: saqshamDocumentsStatusOf(sa?.generalDocStatus, nqas?.certificationStatus) || "-"
      },
      {
        kind: "kv",
        label: "Documents Status (Report)",
        value: documentsStatusReportDisplayOf(
          sa?.generalDocStatus,
          f.documentsStatusReport,
          nqas?.certificationStatus
        ) || "-"
      },
      {
        kind: "kv",
        label: "Assessment dates",
        value: dateRangeText(sa?.actualStartDate, sa?.actualEndDate)
      },
      ...assessors.length ? assessors.map((a) => ({ kind: "kv", label: a.label, value: a.value })) : [{ kind: "kv", label: "Assessors", value: "Not recorded", muted: true }]
    ]),
    /* ONE IA card (Part 3): the four-quarter table AND the chart live inside
       this card, drawn full width by the engine. The old separate Q1/Q2 mini
       table is gone; the card carries no kv rows because its own table is
       rendered from `model.iaChart` (same numbers, same quarters). */
    { id: "ia", title: "Internal Assessment & Kayakalp", hex: "#0f766e", rows: [], missing: [] }
  ];
  const page2Left = [
    card("surveillance", "Surveillance & Recertification", "#7c3aed", [
      { kind: "kv", label: "1st surveillance due", value: formatVisitDate(visits[0]?.due) },
      { kind: "kv", label: "1st surveillance done", value: visitDone(visits[0]) },
      { kind: "kv", label: "2nd surveillance due", value: formatVisitDate(visits[1]?.due) },
      { kind: "kv", label: "2nd surveillance done", value: visitDone(visits[1]) },
      { kind: "pill", label: "Recertification", value: recert.text, tone: recert.tone },
      {
        kind: "kv",
        label: "Next full recertification",
        value: toDdMmmYyyy(nqas?.validityDate ?? null)
      }
    ]),
    card("documents", "Documents", "#475569", [
      ...documents.map((d) => ({
        kind: "kv",
        // Only a required document carries a badge; "(Optional)" is gone.
        label: d.badge ? `${d.label} (${d.badge})` : d.label,
        value: d.value,
        muted: !d.has,
        link: d.has ? d.url ?? void 0 : void 0
      })),
      {
        kind: "kv",
        label: "Documents uploaded",
        value: `${documents.filter((d) => d.has).length} of ${documents.length}`
      }
    ])
  ];
  const page2Right = [
    card("fund", "Gap Closure", "#b45309", [
      { kind: "kv", label: "Financial year", value: clean(fund?.financialYear) },
      { kind: "kv", label: "Status", value: clean(fund?.status) },
      { kind: "kv", label: "Sanctioned", value: money(fund?.amountSanctioned) },
      { kind: "kv", label: "Released", value: money(fund?.amountReleased) },
      { kind: "kv", label: "Utilized", value: money(fund?.amountUtilized) }
    ], "Gap closure: not recorded"),
    card("building", "Building & Fire NOC", "#b91c1c", [
      { kind: "kv", label: "Building type", value: clean(building?.buildingType) },
      { kind: "kv", label: "Building status", value: buildingStatus },
      { kind: "kv", label: "NOC available", value: clean(noc?.nocAvailable) },
      {
        kind: "kv",
        label: "NOC document",
        // Presence only — a file name never prints on the sheet.
        value: clean(noc?.nocAttachmentName ?? noc?.nocLink) ? "Uploaded" : "Not uploaded"
      },
      { kind: "kv", label: "Issued", value: toDdMmmYyyy(noc?.issuedDate ?? null) },
      { kind: "kv", label: "Expiry", value: toDdMmmYyyy(noc?.expiryDate ?? null) },
      { kind: "pill", label: "Fire NOC validity", value: nocValidity, tone: /expired/i.test(nocValidity) ? "red" : /valid/i.test(nocValidity) ? "green" : "amber" }
    ], "Building and Fire NOC: not recorded"),
    {
      id: "checks",
      title: "Needs attention & data checks",
      hex: "#c2410c",
      rows: checks.length ? checks.map((c) => ({ kind: "kv", value: c, muted: false })) : [{ kind: "kv", value: "No issues found", muted: true }],
      missing: []
    }
  ];
  if (scores) {
    const hasAny = scores.overall != null || scores.pss != null || scores.areas.some((a) => a.score != null) || scores.departments.some((d) => d.score != null);
    const areaRows = scores.areas.filter((a) => a.score != null).map((a) => sheetScoreRow(`${a.key} ${a.name}`, a.score, scoreBands));
    if (hasAny && (scores.overall != null || areaRows.length > 0 || scores.pss != null)) {
      page2Left.push(
        card("scores", "Assessment scores (Annexure I)", "#0f766e", [
          sheetScoreRow("Overall score", scores.overall, scoreBands),
          ...areaRows,
          sheetScoreRow("Patient satisfaction (PSS)", scores.pss, scoreBands)
        ])
      );
    }
    const departmentRows = scores.departments.filter((d) => d.score != null).map((d) => sheetScoreRow(d.canonicalName || d.name, d.score, scoreBands));
    if (departmentRows.length > 0) {
      page2Right.push(
        card("deptScores", "Department scores", "#0d9488", departmentRows)
      );
    }
  }
  const recent = [...opts.audits ?? []].filter((a) => !noisyAudit(a)).sort((a, b) => b.changedAt - a.changedAt).slice(0, 5).map((a) => ({
    when: toDdMmmYyyy(a.changedAt) || istStamp(new Date(a.changedAt)).slice(0, 11),
    who: clean(a.changedByName) || "System",
    what: auditLine(a, `Cycle ${cycleNo}`),
    cycle: `C${cycleNo}`
  })).filter((a) => a.what.length > 0);
  const newestAudit = [...opts.audits ?? []].filter((a) => !noisyAudit(a)).sort((a, b) => b.changedAt - a.changedAt)[0];
  const lastUpdated = newestAudit ? `${istStamp(new Date(newestAudit.changedAt))} · ${clean(newestAudit.changedByName) || "System"}` : f.updatedAt ? `${istStamp(new Date(f.updatedAt))} · System` : "";
  const meta = [
    { label: "Remarks", value: clean(f.remarks) },
    { label: "Last updated", value: lastUpdated }
  ];
  const validityChip = isDeferred ? coolingText : isConditional ? `Conditionality review by ${toDdMmmYyyy(nqas?.validityDate ?? null) || "not recorded"}` : nqas?.validityDate ? `Valid till ${toDdMmmYyyy(nqas.validityDate)}` : "No certificate validity";
  return {
    /* Internal only: the sheet never prints a Report ID (Part 2). The value
       still identifies this generation in the audit log and share record. */
    reportId,
    generatedAt: stamp,
    dataAsOf,
    title: sheetText(yourTitle(opts)),
    subtitle: sheetText(
      [
        reportTypeLabel(f.facilityType, opts.typeLabels ?? DEFAULT_REPORT_TYPE_LABELS),
        f.block ? `${f.block} block` : "",
        f.phc,
        clean(f.ninNumber) ? `NIN ${clean(f.ninNumber)}` : ""
      ].filter(Boolean).join(" · ")
    ),
    facilityName: sheetText(clean(f.name) || "Facility"),
    facilityType: sheetText(clean(f.facilityType)),
    nin: clean(f.ninNumber),
    cycle: `#${cycleNo}`,
    cycleNumber: cycleNo,
    cycleType,
    cycleHeading: sheetText(cycleHeading),
    cycleTag,
    cycleStartLabel,
    isCurrentCycle,
    stageName: sheetText(stageLabel),
    statusLabel: sheetText(isDeferred ? "Deferred" : stageLabel),
    statusTone: isDeferred ? "red" : stageTone(stageLabel),
    validityChip,
    stages: stageList(row, today),
    facts: kpiFacts(),
    page1Left,
    page1Right,
    page2Left,
    page2Right,
    recent,
    meta,
    checks,
    documents,
    iaChart: iaChartFor(iaq, { endPeriod: cycleInfo?.iaEndPeriod ?? null }),
    scores
  };
}
function facilityCycles(row, opts = {}) {
  const cycleNo = row.cycleNumber ?? 1;
  const current = {
    cycleNumber: cycleNo,
    cycleType: clean(row.cycleType) || (cycleNo > 1 ? "Recertification" : "Initial"),
    superseded: false,
    inferred: false,
    startedOn: clean(row.sa?.actualStartDate) || clean(row.sa?.scheduledDate) || null,
    sa: row.sa ?? null,
    nqas: row.nqas ?? null,
    documents: Object.entries(row.docs?.files ?? {}).map(([key, file]) => ({
      key,
      label: SHEET_DOCUMENTS.find((d) => d.key === key)?.label ?? key.replace(/_/g, " "),
      name: file.name,
      uploadedAt: file.uploadedAt
    })),
    scores: row.scores ?? null,
    audits: opts.audits ?? []
  };
  const fromHistory = (opts.cycleHistory ?? []).map((c) => ({ ...c }));
  const others = fromHistory.filter((c) => c.cycleNumber !== cycleNo);
  const all = [current, ...others].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const chosen = opts.cycles?.length ? all.filter((c) => opts.cycles.includes(c.cycleNumber)) : all;
  return chosen.length ? chosen : [current];
}
function cycleMasterRow(row, cycle) {
  const cycleScoped = cycle.cycleNumber === (row.cycleNumber ?? 1);
  const docs = cycle.documents ? {
    ...row.docs ?? { uploaded: cycle.documents.length, total: SHEET_DOCUMENTS.length },
    uploaded: cycle.documents.length,
    total: SHEET_DOCUMENTS.length,
    keys: cycle.documents.map((d) => d.key),
    files: Object.fromEntries(
      cycle.documents.map((d) => [d.key, { name: d.name, uploadedAt: d.uploadedAt }])
    ),
    requiredMissing: cycleScoped && row.docs?.requiredMissing ? row.docs.requiredMissing.filter((m) => cycle.documents.some((d) => d.key === m.key)) : row.docs?.requiredMissing ?? null
  } : row.docs;
  return {
    ...row,
    cycleNumber: cycle.cycleNumber,
    cycleType: cycle.cycleType,
    sa: cycle.sa ? { ...cycle.sa } : null,
    nqas: cycle.nqas ? { ...cycle.nqas } : null,
    docs,
    scores: cycle.scores ?? null
  };
}
function buildCycleSheetModel(row, cycle, all, opts = {}) {
  const currentNo = row.cycleNumber ?? 1;
  const isCurrent = cycle.cycleNumber === currentNo;
  const nextCycle = all.filter((c) => c.cycleNumber > cycle.cycleNumber).sort((a, b) => a.cycleNumber - b.cycleNumber)[0];
  const supersededBy = !isCurrent ? cycle.supersededBy ?? nextCycle?.cycleNumber ?? null : null;
  const startedOn = cycleStartIso(cycle) || null;
  const endIso = cycleEndIso(cycle);
  return buildSheetModel(cycleMasterRow(row, cycle), {
    ...opts,
    audits: isCurrent ? opts.audits ?? cycle.audits ?? [] : cycle.audits ?? [],
    cycle: {
      current: isCurrent,
      supersededBy,
      startedOn,
      closedOn: null,
      iaEndPeriod: !isCurrent ? fyQuarterOf(endIso) : null
    }
  });
}
function rowsResultDocument(row, doc) {
  if (!doc?.has) return doc?.required ? "Not uploaded (required)" : "Not uploaded";
  const when = doc.file?.uploadedAt ? toDdMmmYyyy(doc.file.uploadedAt) : toDdMmmYyyy(row.resultDocumentUpdatedAt ?? null);
  return when ? `Uploaded ${when}` : "Uploaded";
}
function assessorLine(name, hud) {
  const n = clean(name);
  if (!n) return "";
  const h = clean(hud);
  return h ? `${n} (${h})` : n;
}
function yourTitle(opts) {
  return opts.title ?? "Facility Profile Sheet";
}
function generatedDate(opts) {
  return opts.generatedAt ?? /* @__PURE__ */ new Date();
}
function stageList(row, today) {
  const sa = row.sa ?? null;
  const nqas = row.nqas ?? null;
  const saDone = !!(clean(sa?.actualEndDate) || sa?.scorePercent != null || clean(sa?.status) === "Completed");
  const nqasDone = !!(clean(nqas?.actualEndDate) || clean(nqas?.status) === "Completed");
  const certStatus = clean(nqas?.certificationStatus);
  const certified = /quality certified|with conditionality/i.test(certStatus);
  const deferred = certStatus === "Deferred";
  const hasResult = !!certStatus;
  const visitDue = clean(nqas?.surveillanceDue1);
  const visitDone = clean(nqas?.surveillanceDone1) !== "" && clean(nqas?.surveillanceDone1) <= today;
  const stages = [
    {
      label: "Eligibility",
      state: "done",
      date: ""
    },
    {
      label: "State Assessment",
      state: saDone ? "done" : clean(sa?.scheduledDate) ? "current" : "upcoming",
      date: toDdMmmYyyy(sa?.actualEndDate ?? sa?.actualStartDate ?? sa?.scheduledDate ?? null)
    },
    {
      label: "NQAS Assessment",
      state: nqasDone ? "done" : clean(nqas?.scheduledStartDate) ? "current" : "upcoming",
      date: toDdMmmYyyy(nqas?.actualEndDate ?? nqas?.scheduledStartDate ?? null)
    },
    {
      label: "Certification",
      state: certified ? "done" : deferred ? "blocked" : hasResult ? "done" : nqasDone ? "current" : "upcoming",
      date: toDdMmmYyyy(nqas?.certificationDate ?? nqas?.goiLetterDate ?? null)
    },
    {
      label: "Surveillance",
      state: certified && visitDone ? "done" : certified && visitDue ? "current" : "upcoming",
      date: toDdMmmYyyy(visitDue || null)
    },
    { label: "Recertification", state: "upcoming", date: toDdMmmYyyy(nqas?.validityDate ?? null) }
  ];
  const firstUnfinished = stages.findIndex((s) => s.state !== "done" && s.state !== "blocked");
  return stages.map(
    (s, i) => s.state === "current" && i > firstUnfinished ? { ...s, state: "upcoming" } : s
  );
}
function wrapText(doc, text, maxW) {
  const out = [];
  for (const para of sheetText(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (doc.getTextWidth(next) <= maxW) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      if (doc.getTextWidth(word) <= maxW) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        if (doc.getTextWidth(chunk + ch) > maxW) {
          out.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}
const LABEL_SHARE = 0.36;
const CLAMP_LINES = { remarks: 6, departments: 8 };
function clampValueLines(label, lines) {
  const key = (label ?? "").toLowerCase();
  const max = key.includes("remarks") ? CLAMP_LINES.remarks : key.includes("assessed") || key.includes("department") ? CLAMP_LINES.departments : 0;
  if (!max || lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  const hidden = lines.length - max;
  kept[max - 1] = `${kept[max - 1]} +${hidden} more`;
  return kept;
}
function measureCard(doc, card, x, y, w, size, showEmpty, opts = {}) {
  const pad = opts.tight ? 1.8 : 2.4;
  const inner = w - pad * 2;
  const labelW = inner * LABEL_SHARE;
  const valueW = inner - labelW - 1.6;
  const lineH = size * (opts.tight ? 0.4 : 0.42);
  const rowMin = opts.tight ? 5 : SHEET.rowMin;
  const rows = [];
  let cursor = y + SHEET.cardHeader + (opts.tight ? 1.1 : 1.4);
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(size);
  for (const row of card.rows) {
    if (row.kind === "mini" && row.mini) {
      const h2 = (opts.tight ? 4 : 4.4) + row.mini.rows.length * (opts.tight ? 4.2 : 4.6);
      rows.push({ row, labelLines: [], valueLines: [], height: h2, y: cursor });
      cursor += h2;
      continue;
    }
    const labelLines = row.label ? wrapText(doc, row.label, labelW) : [];
    const raw = wrapText(doc, row.value ?? "", valueW - (row.link ? 16 : 0));
    const valueLines = opts.clamp ? clampValueLines(row.label, raw) : raw;
    const lines = Math.max(labelLines.length, valueLines.length, 1);
    const h = Math.max(rowMin, lines * lineH + (opts.tight ? 1.6 : 2.1));
    rows.push({ row, labelLines, valueLines, height: h, y: cursor });
    cursor += h;
  }
  if (!showEmpty && card.missing.length && !opts.hideMissingLine) {
    doc.setFontSize(SHEET.min);
    const text = `Not recorded: ${card.missing.join(", ")}`;
    const lines = wrapText(doc, text, inner).length;
    cursor += lines * SHEET.min * (opts.tight ? 0.4 : 0.42) + (opts.tight ? 1.2 : 1.8);
  }
  return {
    card,
    height: cursor - y + 1.2,
    rows,
    blankLine: card.missing.length ? `Not recorded: ${card.missing.join(", ")}` : ""
  };
}
const TONES = {
  green: [4, 120, 87],
  amber: [180, 83, 9],
  red: [185, 28, 28],
  blue: [3, 105, 161],
  teal: [13, 148, 136],
  grey: [100, 116, 139]
};
function hexRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function drawChangeMark(doc, x, y, kind, tone) {
  doc.setFillColor(...tone);
  const s = 1.15;
  if (kind === "flat") {
    doc.rect(x, y - s * 0.5, s, s * 0.5, "F");
    return;
  }
  const dir = kind === "up" ? -1 : 1;
  doc.triangle(x, y, x + s, y, x + s / 2, y + dir * s * 0.8, "F");
}
function drawPill(doc, x, y, text, tone, maxW, size = SHEET.min) {
  const colour = TONES[tone] ?? TONES.grey;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(size);
  const label = sheetText(text);
  const w = Math.min(maxW, doc.getTextWidth(label) + 4.4);
  doc.setDrawColor(...colour);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y - 3.1, w, 4.2, 2.1, 2.1, "FD");
  doc.setTextColor(...colour);
  doc.text(label, x + 2.2, y);
  doc.setTextColor(0, 0, 0);
}
function drawCard(doc, layout, x, y, w, size, showEmpty, opts = {}) {
  const pad = opts.tight ? 1.8 : 2.4;
  const inner = w - pad * 2;
  const labelW = inner * LABEL_SHARE;
  const valueX = x + pad + labelW + 1.6;
  const valueW = inner - labelW - 1.6;
  const lineH = size * (opts.tight ? 0.4 : 0.42);
  const tint = hexRgb(layout.card.hex);
  doc.setFillColor(...tint);
  doc.rect(x, y, w, SHEET.cardHeader, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.body);
  doc.text(sheetText(layout.card.title).toUpperCase(), x + pad, y + 4.1);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  doc.rect(x, y, w, layout.height, "S");
  for (const r of layout.rows) {
    const rowY = r.y;
    if (r.row.kind === "mini" && r.row.mini) {
      const mini = r.row.mini;
      doc.setFontSize(SHEET.min);
      doc.setTextColor(71, 85, 105);
      doc.setFont(SHEET_FONT, "bold");
      const nameW = labelW;
      const prevX = x + pad + nameW + 1.2;
      const latestX = valueX + valueW * 0.42;
      const changeX = valueX + valueW;
      doc.text("Tracker", x + pad, rowY + 2.6);
      doc.text(wrapText(doc, mini.previousLabel, valueW * 0.4)[0] ?? "", prevX, rowY + 2.6);
      doc.text(wrapText(doc, mini.latestLabel, valueW * 0.4)[0] ?? "", latestX, rowY + 2.6);
      doc.text("Change", changeX, rowY + 2.6, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(x + pad, rowY + 3.6, x + w - pad, rowY + 3.6);
      let cy = rowY + 7.6;
      doc.setFont(SHEET_FONT, "normal");
      for (const m of mini.rows) {
        doc.setFontSize(size);
        doc.setTextColor(15, 23, 42);
        doc.text(m.name, x + pad, cy);
        const pv = m.previous == null ? "Not reported" : scoreText(m.previous);
        const lv = m.latest == null ? "Not yet reported" : scoreText(m.latest);
        doc.setTextColor(71, 85, 105);
        doc.text(pv, prevX, cy);
        doc.setTextColor(15, 23, 42);
        doc.text(lv, latestX, cy);
        if (m.previous != null && m.latest != null) {
          const delta = m.latest - m.previous;
          const kind = Math.abs(delta) < 5e-3 ? "flat" : delta > 0 ? "up" : "down";
          drawChangeMark(doc, changeX - 10, cy - 1.1, kind, TONES[kind === "flat" ? "grey" : delta > 0 ? "green" : "red"]);
          doc.setFontSize(SHEET.min);
          doc.text(`${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`, changeX, cy, { align: "right" });
        } else {
          doc.setFontSize(SHEET.min);
          doc.setTextColor(100, 116, 139);
          doc.text("n/a", changeX, cy, { align: "right" });
        }
        cy += 4.6;
      }
      doc.setTextColor(0, 0, 0);
      continue;
    }
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.label);
    doc.setTextColor(100, 116, 139);
    r.labelLines.forEach((line, i) => doc.text(line, x + pad, rowY + 3.1 + i * lineH + (r.height - 2.1 - r.labelLines.length * lineH) * 0));
    if (r.row.kind === "pill") {
      drawPill(doc, valueX, rowY + 3.4, r.row.value ?? "", r.row.tone ?? "grey", valueW);
    } else {
      doc.setFont(SHEET_FONT, r.row.muted ? "italic" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(r.row.muted ? 100 : 15, r.row.muted ? 116 : 23, r.row.muted ? 139 : 42);
      r.valueLines.forEach((line, i) => {
        doc.text(line, valueX, rowY + 3.1 + i * lineH);
      });
      if (r.row.bar) {
        const trackY = rowY + r.height - 1.15;
        const trackW = valueW;
        doc.setFillColor(241, 245, 249);
        doc.rect(valueX, trackY, trackW, 0.7, "F");
        doc.setFillColor(...TONES[r.row.bar.tone] ?? TONES.teal);
        doc.rect(
          valueX,
          trackY,
          trackW * Math.max(0, Math.min(100, r.row.bar.value)) / 100,
          0.7,
          "F"
        );
      }
      if (r.row.link) {
        const firstLine = r.valueLines[0] ?? "";
        const valueWUsed = doc.getTextWidth(firstLine);
        const openLabel = "· Open →";
        doc.setFont(SHEET_FONT, "bold");
        doc.setFontSize(8.5);
        const openW = doc.getTextWidth(openLabel);
        const openX = Math.min(
          valueX + valueWUsed + 1.6,
          x + w - pad - openW
        );
        doc.setTextColor(13, 105, 96);
        doc.text(openLabel, openX, rowY + 3.1);
        doc.setDrawColor(13, 105, 96);
        doc.setLineWidth(0.18);
        const openStart = openX + doc.getTextWidth("· ");
        doc.line(openStart, rowY + 3.9, openStart + doc.getTextWidth("Open"), rowY + 3.9);
        doc.link(valueX - 0.6, rowY + 0.2, valueWUsed + 2, 6, { url: r.row.link });
        doc.link(openX - 0.6, rowY - 0.4, openW + 1.2, 6, { url: r.row.link });
        doc.setTextColor(0, 0, 0);
      }
      doc.setTextColor(0, 0, 0);
    }
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.1);
    doc.line(x + pad, rowY + r.height, x + w - pad, rowY + r.height);
  }
  if (!showEmpty && layout.blankLine && !opts.hideMissingLine) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setFontSize(SHEET.min);
    doc.setTextColor(148, 163, 184);
    const lineH2 = SHEET.min * 0.42;
    const lines = wrapText(doc, layout.blankLine, inner);
    const last = y + layout.height - 2.6;
    lines.forEach((line, i) => doc.text(line, x + pad, last - (lines.length - 1 - i) * lineH2));
    doc.setTextColor(0, 0, 0);
  }
}
const DEPARTMENT = ORG_SIGNATURE;
const CONFIDENTIAL = "Confidential. Facility quality data. Handle per District Quality Assurance Unit guidelines.";
const SHEET_PAGE1_LEFT = ["identity", "status", "sa"];
const SHEET_PAGE1_RIGHT = ["nqas", "nqasDetails"];
const SHEET_PAGE2_CARDS = ["surveillance", "fund", "building", "scores", "deptScores", "documents", "checks"];
const SHEET_CARD_PRIORITY = [
  ...SHEET_PAGE1_LEFT,
  ...SHEET_PAGE1_RIGHT,
  ...SHEET_PAGE2_CARDS
];
const SHEET_DROPPABLE = ["checks", "documents", "building", "fund", "surveillance"];
function tailHeightMm(doc, model, includeRecent) {
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  const remarksLines = Math.min(6, Math.max(1, wrapText(doc, model.meta[0]?.value ?? "", SHEET.content - 42).length));
  const meta = 5 + remarksLines * 3.4 + 2;
  const recent = includeRecent && model.recent.length ? 6 + model.recent.length * 5.4 + 3 : 0;
  return meta + recent + 2;
}
function cardsInPriorityOrder(model) {
  const all = [...model.page1Left, ...model.page1Right, ...model.page2Left, ...model.page2Right];
  const byId = new Map(all.map((c) => [c.id, c]));
  const ordered = [];
  for (const id of SHEET_CARD_PRIORITY) {
    const c = byId.get(id);
    if (c) {
      ordered.push(c);
      byId.delete(id);
    }
  }
  return { cards: [...ordered, ...byId.values()], ia: all.find((c) => c.id === "ia") ?? null };
}
function trimCard(card, hide) {
  if (hide.includes(card.id)) return null;
  if (card.id === "documents" && hide.includes("documentsDetail")) {
    const count = card.rows.filter((r) => (r.label ?? "").startsWith("Documents uploaded"));
    return { ...card, rows: count.length ? count : card.rows.slice(-1), missing: [] };
  }
  if (card.id === "nqasDetails" && hide.includes("departmentDetail")) {
    return {
      ...card,
      rows: card.rows.filter(
        (r) => !/assessed|department/i.test(r.label ?? "") || /assessed$/i.test(r.value ?? "")
      ),
      missing: []
    };
  }
  return card;
}
function fillColumns(items, capacity) {
  const left = [];
  const right = [];
  let leftH = 0;
  let rightH = 0;
  let i = 0;
  for (; i < items.length; i += 1) {
    const item = items[i];
    const fitsLeft = leftH + item.height <= capacity;
    const fitsRight = rightH + item.height <= capacity;
    if (!fitsLeft && !fitsRight) break;
    if (fitsLeft && (!fitsRight || leftH <= rightH)) {
      left.push(item);
      leftH += item.height;
    } else {
      right.push(item);
      rightH += item.height;
    }
  }
  for (let guard = 0; guard < 4; guard += 1) {
    const gap = Math.abs(leftH - rightH);
    if (gap <= 10) break;
    const from = leftH > rightH ? left : right;
    const last = from[from.length - 1];
    if (!last) break;
    const targetUsed = leftH > rightH ? rightH : leftH;
    if (targetUsed + last.height > capacity) break;
    if (Math.abs(gap - 2 * last.height) >= gap) break;
    from.pop();
    (leftH > rightH ? right : left).push(last);
    if (leftH > rightH) {
      leftH -= last.height;
      rightH += last.height;
    } else {
      rightH -= last.height;
      leftH += last.height;
    }
  }
  return { left, right, leftH, rightH, rest: items.slice(i) };
}
function balanceColumns(left, right, capacity) {
  const sum = (list) => list.reduce((s, c) => s + c.height, 0);
  for (let guard = 0; guard < 4; guard += 1) {
    const leftH = sum(left);
    const rightH = sum(right);
    const gap = Math.abs(leftH - rightH);
    if (gap <= SHEET_BODY.balanceMm) break;
    const from = leftH > rightH ? left : right;
    const to = leftH > rightH ? right : left;
    const last = from[from.length - 1];
    if (!last) break;
    if (to.reduce((s, c) => s + c.height, 0) + last.height > capacity) break;
    if (Math.min(leftH, rightH) + last.height > capacity) break;
    if (Math.abs(gap - 2 * last.height) >= gap) break;
    from.pop();
    to.push(last);
  }
  return { leftH: sum(left), rightH: sum(right) };
}
function layoutSheet(doc, model, step, showEmpty) {
  const hidden = [];
  for (const id of step.hide) if (!hidden.includes(id)) hidden.push(id);
  const dropped = [];
  const drawEmpty = showEmpty && !step.collapseBlanks;
  const cardOpts = {
    tight: step.tight,
    clamp: step.clamp,
    hideMissingLine: step.collapseBlanks
  };
  const { cards, ia } = cardsInPriorityOrder(model);
  const byId = /* @__PURE__ */ new Map();
  for (const card of cards) {
    const trimmed = trimCard(card, step.hide);
    if (trimmed) byId.set(trimmed.id, trimmed);
  }
  for (const id of step.drop) {
    if (byId.delete(id)) dropped.push(id);
  }
  const measure = (card) => {
    const layout = measureCard(doc, card, COLUMN_X.left, 0, SHEET.colW, step.size, drawEmpty, cardOpts);
    return { card, layout, withChart: false, height: layout.height + SHEET_BODY.cardGap };
  };
  const take = (id) => {
    const card = byId.get(id);
    if (!card) return null;
    byId.delete(id);
    return measure(card);
  };
  const p1Left = SHEET_PAGE1_LEFT.map(take).filter((c) => !!c);
  const p1Right = SHEET_PAGE1_RIGHT.map(take).filter((c) => !!c);
  const p2 = [];
  for (const id of SHEET_PAGE2_CARDS) {
    const item = take(id);
    if (item) p2.push(item);
  }
  for (const leftover of byId.values()) {
    if (leftover.id === "ia") continue;
    p2.push(measure(leftover));
  }
  const iaH = model.iaChart.points.length && ia ? measureIaCard(doc, model, SHEET.content, step.chartMm) : ia ? 12 : 0;
  const tail = tailHeightMm(doc, model, step.includeRecent);
  const cap1 = SHEET_BODY.cap1;
  const cap2 = SHEET_BODY.cap2 - tail;
  const seedPage1 = (columnCapacity) => {
    const left = [];
    const right = [];
    const rest = [];
    const fillInto = (items, column) => {
      let used = column.reduce((s, c) => s + c.height, 0);
      for (const item of items) {
        if (used + item.height <= columnCapacity) {
          column.push(item);
          used += item.height;
        } else rest.push(item);
      }
    };
    fillInto(p1Left, left);
    fillInto(p1Right, right);
    const balanced = balanceColumns(left, right, columnCapacity);
    return { left, right, leftH: balanced.leftH, rightH: balanced.rightH, rest };
  };
  const attempt = (iaOnPage12) => {
    const columnCap1 = Math.max(40, cap1 - (iaOnPage12 ? iaH + SHEET_BODY.cardGap : 0));
    const p1 = seedPage1(columnCap1);
    const columnCap2 = Math.max(40, cap2 - (iaOnPage12 ? 0 : iaH + SHEET_BODY.cardGap));
    const stream = [...p1.rest, ...p2];
    const packed = fillColumns(stream, columnCap2);
    const balanced = balanceColumns(packed.left, packed.right, columnCap2);
    const page1 = {
      left: p1.left,
      right: p1.right,
      leftH: p1.leftH,
      rightH: p1.rightH,
      iaH: iaOnPage12 ? iaH : 0,
      top: SHEET_BODY.top1,
      capacity: cap1
    };
    const page2 = {
      left: packed.left,
      right: packed.right,
      leftH: balanced.leftH,
      rightH: balanced.rightH,
      iaH: iaOnPage12 ? 0 : iaH,
      top: SHEET_BODY.top2,
      capacity: cap2
    };
    return { page1, page2, overflow: packed.rest };
  };
  const first = attempt(true);
  const second = first.overflow.length ? attempt(false) : null;
  const chosen = second ?? first;
  const iaOnPage1 = second === null;
  const ids = (page) => `L[${page.left.map((c) => `${c.card.id} ${c.layout.height.toFixed(1)}`).join(", ")}] R[${page.right.map((c) => `${c.card.id} ${c.layout.height.toFixed(1)}`).join(", ")}]`;
  const diagnostics = [
    `page 1: left ${chosen.page1.leftH.toFixed(1)}mm right ${chosen.page1.rightH.toFixed(1)}mm of ${chosen.page1.capacity.toFixed(0)}mm (${chosen.page1.left.length + chosen.page1.right.length} cards)${iaOnPage1 ? ` + IA ${chosen.page1.iaH.toFixed(1)}mm` : ""} ${ids(chosen.page1)}`,
    `page 2: left ${chosen.page2.leftH.toFixed(1)}mm right ${chosen.page2.rightH.toFixed(1)}mm of ${chosen.page2.capacity.toFixed(0)}mm (${chosen.page2.left.length + chosen.page2.right.length} cards)${iaOnPage1 ? "" : ` + IA ${chosen.page2.iaH.toFixed(1)}mm`} · tail ${tail.toFixed(1)}mm ${ids(chosen.page2)}`
  ];
  const pack = {
    page1: chosen.page1,
    page2: chosen.page2,
    iaOnPage1,
    step,
    hidden,
    dropped,
    violations: [],
    diagnostics
  };
  pack.violations = overlapViolations(pack, chosen.overflow.length);
  return pack;
}
function sheetBoxes(pack) {
  const out = [];
  const stack = (page, which, items, x, id) => {
    let y = page.top + SHEET_BODY.cardGap;
    for (const item of items) {
      out.push({ id: `${id}:${item.card.id}`, page: which, x, y, w: SHEET.colW, h: item.layout.height });
      y += item.height;
    }
    return y;
  };
  const end1 = Math.max(
    stack(pack.page1, 1, pack.page1.left, COLUMN_X.left, "L"),
    stack(pack.page1, 1, pack.page1.right, COLUMN_X.right, "R")
  );
  if (pack.iaOnPage1 && pack.page1.iaH > 0) {
    out.push({ id: "IA", page: 1, x: SHEET.margin, y: end1 + SHEET_BODY.cardGap, w: SHEET.content, h: pack.page1.iaH });
  }
  const end2 = Math.max(
    stack(pack.page2, 2, pack.page2.left, COLUMN_X.left, "L"),
    stack(pack.page2, 2, pack.page2.right, COLUMN_X.right, "R")
  );
  if (!pack.iaOnPage1 && pack.page2.iaH > 0) {
    out.push({ id: "IA", page: 2, x: SHEET.margin, y: end2 + SHEET_BODY.cardGap, w: SHEET.content, h: pack.page2.iaH });
  }
  return out;
}
function overlapViolations(pack, overflow = 0) {
  const out = [];
  const boxes = sheetBoxes(pack);
  const bottom = SHEET_BODY.bottom;
  for (const box of boxes) {
    if (box.y + box.h > bottom + 0.01) {
      out.push(`${box.id} exceeds page ${box.page} (${(box.y + box.h).toFixed(1)}mm > ${bottom}mm)`);
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.page !== b.page) continue;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      if (overlap) out.push(`${a.id} overlaps ${b.id} on page ${a.page}`);
    }
  }
  if (overflow > 0) out.push(`${overflow} card${overflow === 1 ? "" : "s"} do not fit the two pages`);
  return out;
}
function sheetLadder(options = {}) {
  const minSize = Math.min(SHEET.body, Math.max(7, options.minSize ?? SHEET.min));
  const fullChart = options.chartMm ?? IA_CARD.chartMm;
  const base = {
    chartMm: fullChart,
    tight: false,
    clamp: false,
    collapseBlanks: false,
    hide: [],
    includeRecent: true,
    drop: []
  };
  const sizes = [SHEET.body, 8, minSize].filter(
    (s, i, all) => s >= minSize && all.indexOf(s) === i
  );
  const steps = [
    { id: "a:flow", ...base, size: SHEET.body },
    { id: "b:collapse-blanks", ...base, size: SHEET.body, collapseBlanks: true },
    { id: "c:tight-rows", ...base, size: SHEET.body, collapseBlanks: true, tight: true }
  ];
  for (const size of sizes.slice(1)) {
    steps.push({ id: `d:${size}pt`, ...base, size, collapseBlanks: true, tight: true });
  }
  const tight = {
    ...base,
    size: minSize,
    /* 36 mm is the floor: the chart must stay a readable 40 → 36, never a
       squashed 22 mm plot. If it still does not fit, the ladder hides
       optional detail instead. */
    chartMm: Math.min(IA_CARD.minChartMm, fullChart),
    collapseBlanks: true,
    tight: true,
    clamp: true
  };
  steps.push(
    { id: "e:chart-36", ...tight },
    { id: "f:clamp-text", ...tight, chartMm: Math.min(IA_CARD.minChartMm, fullChart) },
    { id: "g1:recent-hidden", ...tight, chartMm: Math.min(IA_CARD.minChartMm, fullChart), includeRecent: false, hide: ["recent"] },
    {
      id: "g2:documents-detail-hidden",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail"]
    },
    {
      id: "g3:department-detail-hidden",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"]
    },
    {
      id: "h:force-fit",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"],
      drop: ["checks", "documents", "building"]
    },
    {
      id: "i:bare-fit",
      ...tight,
      chartMm: Math.min(IA_CARD.minChartMm, fullChart),
      includeRecent: false,
      hide: ["recent", "documentsDetail", "departmentDetail"],
      drop: ["checks", "documents", "building", "fund", "surveillance"]
    }
  );
  return steps;
}
function chooseFit(doc, model, showEmpty, options = {}) {
  const diagnostics = [];
  const steps = sheetLadder(options);
  let last = null;
  for (const step of steps) {
    const pack2 = layoutSheet(doc, model, step, showEmpty);
    last = pack2;
    const fits = pack2.violations.length === 0;
    diagnostics.push(
      `${fits ? "fit" : "overflow"}: ${step.id} · ${step.size}pt · 2 pages`,
      ...pack2.diagnostics.map((d) => `  ${d}`)
    );
    if (!fits) diagnostics.push(...pack2.violations.map((v) => `  ${v}`));
    if (fits) {
      const shortened = [...step.hide, ...step.drop];
      if (shortened.length) {
        diagnostics.push(`shortened: ${shortened.join(", ")} hidden to fit 2 pages`);
      }
      return {
        size: step.size,
        includeRecent: step.includeRecent,
        diagnostics,
        pack: pack2,
        shortened,
        dropped: pack2.dropped,
        fits: true
      };
    }
  }
  const pack = last ?? layoutSheet(doc, model, steps[steps.length - 1], showEmpty);
  diagnostics.push(
    `warning: the two pages could not hold every card at ${pack.step.size}pt; the sheet printed without overlap and the measured heights are logged above`
  );
  return {
    size: pack.step.size,
    includeRecent: pack.step.includeRecent,
    diagnostics,
    pack,
    shortened: [...pack.hidden, ...pack.dropped],
    dropped: pack.dropped,
    fits: false
  };
}
async function buildFacilitySheet(row, opts = {}) {
  const { jsPDF: JsPDF } = await __vitePreload(async () => { const { jsPDF: JsPDF } = await import('./vendor-jspdf-BarNdCns.js').then(n => n.j);return { jsPDF: JsPDF }},true              ?[]:void 0);
  const cycles = facilityCycles(row, opts);
  const models = cycles.map((cycle) => buildCycleSheetModel(row, cycle, cycles, opts));
  const showEmpty = opts.showEmpty ?? false;
  const a3 = opts.paper === "a3";
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: a3 ? "a3" : "a4" });
  installSheetFonts(doc, await loadSheetFonts());
  const scale = a3 ? 297 / SHEET.pageW : 1;
  const gfx = doc;
  const pageHeightPt = (gfx.internal?.pageSize?.getHeight() ?? SHEET.pageH) * (72 / 25.4);
  const offsetPt = -(scale - 1) * pageHeightPt;
  const beginPage = () => {
    if (scale === 1) return;
    doc.saveGraphicsState();
    gfx.internal?.write?.(`${scale} 0 0 ${scale} 0 ${offsetPt.toFixed(3)} cm`);
  };
  const endPage = () => {
    if (scale === 1) return;
    doc.restoreGraphicsState();
  };
  const diagnostics = [];
  let qrSymbolMm = SHEET_QR.symbolMm;
  let qrCheckFailed = false;
  if (opts.qrUrl && opts.includeQr !== false) {
    try {
      const matrix = qrMatrix(opts.qrUrl, "M");
      const first = await decodePrintedQr(matrix, qrSymbolMm, 150);
      if (first !== opts.qrUrl) {
        qrSymbolMm = SHEET_QR.fallbackSymbolMm;
        diagnostics.push(
          `qr-check: 150 dpi decode failed at ${SHEET_QR.symbolMm} mm; rebuilt at ${qrSymbolMm} mm`
        );
        const second = await decodePrintedQr(matrix, qrSymbolMm, 150);
        if (second !== opts.qrUrl) {
          qrCheckFailed = true;
          diagnostics.push(`qr-check: decode still failed at ${qrSymbolMm} mm`);
        }
      }
    } catch (err) {
      qrCheckFailed = true;
      diagnostics.push(
        `qr-check: ${err instanceof Error ? err.message : "the symbol could not be decoded"}`
      );
    }
  }
  const reports = models.map((model) => {
    const fit = chooseFit(doc, model, showEmpty, {
      minSize: opts.minSize,
      chartMm: opts.chartHeight
    });
    diagnostics.push(
      `cycle #${model.cycleNumber} (${model.cycleTag.toLowerCase()} · ${model.cycleType}): ${fit.size}pt · ${fit.pack.step.id} · ${fit.fits ? "fit on 2 pages" : "overflow"}`,
      ...fit.diagnostics.map((d) => `  ${d}`)
    );
    for (const violation of fit.pack.violations) {
      diagnostics.push(`  warning: overlap check — ${violation}`);
    }
    if (fit.shortened.length) {
      diagnostics.push(`shortened: ${fit.shortened.join(", ")} hidden to fit two pages`);
    }
    return { model, fit };
  });
  const total = reports.length * 2;
  reports.forEach((report, index) => {
    if (index > 0) doc.addPage();
    drawCycleReport(
      doc,
      report.model,
      report.fit.pack,
      report.fit.size,
      index * 2 + 1,
      total,
      index === 0,
      showEmpty,
      opts,
      beginPage,
      endPage,
      diagnostics,
      qrSymbolMm
    );
  });
  const pages = doc.getNumberOfPages();
  if (pages !== total) {
    diagnostics.push(`warning: jsPDF reports ${pages} pages, the pack planned ${total}`);
  }
  const shortened = [...new Set(reports.flatMap((r) => r.fit.shortened))];
  const fileName = opts.fileName ?? facilityReportFileName({
    name: row.facility.name,
    facilityType: row.facility.facilityType,
    phc: row.facility.phc,
    typeLabels: opts.typeLabels,
    date: generatedDate(opts),
    ext: "pdf",
    cycles: { chosen: models.map((m) => m.cycleNumber), total: opts.cycleHistory?.length ?? models.length }
  });
  const allText = [
    ...models.flatMap((model) => [
      model.facilityName,
      model.subtitle,
      model.statusLabel,
      model.validityChip,
      model.cycleHeading,
      model.cycleStartLabel,
      ...model.facts.flatMap((f) => [f.label, f.value]),
      ...model.page1Left.flatMap(cardTexts),
      ...model.page1Right.flatMap(cardTexts),
      ...model.page2Left.flatMap(cardTexts),
      ...model.page2Right.flatMap(cardTexts),
      ...model.recent.flatMap((r) => [r.when, r.who, r.what]),
      ...model.meta.flatMap((m) => [m.label, m.value]),
      ...model.checks,
      ...model.iaChart.points.flatMap((p) => [p.label, p.shortLabel]),
      model.iaChart.note
    ])
  ];
  const missing = unsupportedSheetGlyphs(...allText);
  if (missing.length) {
    throw new Error(
      `The facility sheet contains characters the embedded Noto Sans faces cannot draw: ${missing.join(" ")}. Remove or transliterate them, then export again.`
    );
  }
  return {
    doc,
    pages,
    reportId: models[0]?.reportId ?? "",
    fileName,
    diagnostics,
    shortened,
    cycles: models.map((m) => m.cycleNumber),
    qrCheckFailed
  };
}
function drawCycleReport(doc, model, pack, size, firstPage, total, firstOfDocument, showEmpty, opts, beginPage, endPage, diagnostics = [], qrSymbolMm = SHEET_QR.symbolMm) {
  const step = pack.step;
  const drawEmpty = showEmpty && !step.collapseBlanks;
  beginPage();
  headerBand(doc, model, opts);
  let header = sheetHeaderLayout(
    doc,
    model,
    firstOfDocument ? opts : { ...opts, qrUrl: void 0 },
    { symbolMm: qrSymbolMm }
  );
  if (firstOfDocument) {
    let violations = headerBoxViolations(header.boxes);
    if (violations.length) {
      diagnostics.push(`header-relayout: ${violations.join("; ")}`);
      header = sheetHeaderLayout(doc, model, opts, { tight: true, symbolMm: qrSymbolMm });
      violations = headerBoxViolations(header.boxes);
      if (violations.length) diagnostics.push(`header-overlap: ${violations.join("; ")}`);
    }
  }
  doc.setTextColor(15, 23, 42);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(header.titleSize);
  header.titleLines.forEach((line, i) => doc.text(line, SHEET.margin, header.titleYs[i]));
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(header.subtitle, SHEET.margin, header.subtitleY);
  if (firstOfDocument && header.qr) {
    const { matrix, x, y, size: size2 } = header.qr;
    if (header.qrCheck && !header.qrCheck.ok)
      diagnostics.push(`qr-check: ${header.qrCheck.reason}`);
    try {
      drawQr(doc, matrix, x, y, size2);
      doc.link(x, y, size2, size2, { url: opts.qrUrl });
      if (header.caption) {
        doc.setFont(SHEET_FONT, "normal");
        doc.setFontSize(SHEET_QR.captionPt);
        doc.setTextColor(71, 85, 105);
        doc.text(header.caption.text, header.caption.x, header.caption.y);
      }
    } catch {
    }
  }
  for (const p of header.pills)
    drawPill(doc, p.x, p.y, p.text, p.tone, p.w, p.size);
  drawStepper(doc, model.stages, header.stepperY);
  drawFacts(doc, model.facts, header.factsY, header.factsH);
  const leftEnd = drawPackedColumn(doc, model, pack.page1.left, COLUMN_X.left, pack.page1.top, size, drawEmpty, step);
  const rightEnd = drawPackedColumn(doc, model, pack.page1.right, COLUMN_X.right, pack.page1.top, size, drawEmpty, step);
  if (pack.iaOnPage1 && pack.page1.iaH > 0) {
    drawIaCard(doc, model, Math.max(pack.page1.top, leftEnd, rightEnd) + SHEET_BODY.cardGap, step.chartMm);
  }
  footer(doc, model, firstPage, total);
  endPage();
  doc.addPage();
  beginPage();
  slimHeader(doc, model);
  {
    const slim = slimHeaderLayout(doc, model);
    const violations = headerBoxViolations([slim.nameBox, slim.metaBox]);
    if (violations.length) diagnostics.push(`header-overlap p2: ${violations.join("; ")}`);
  }
  const left2 = drawPackedColumn(doc, model, pack.page2.left, COLUMN_X.left, pack.page2.top, size, drawEmpty, step);
  const right2 = drawPackedColumn(doc, model, pack.page2.right, COLUMN_X.right, pack.page2.top, size, drawEmpty, step);
  let cursor = Math.max(pack.page2.top, left2, right2);
  if (!pack.iaOnPage1 && pack.page2.iaH > 0) {
    cursor = drawIaCard(doc, model, cursor + SHEET_BODY.cardGap, step.chartMm);
  }
  cursor = drawMeta(doc, model.meta, cursor + 2);
  if (step.includeRecent && model.recent.length) {
    cursor = drawRecent(doc, model.recent, cursor);
  }
  footer(doc, model, firstPage + 1, total);
  endPage();
}
async function exportFacilitySheet(row, opts = {}) {
  const result = await buildFacilitySheet(row, opts);
  const blob = result.doc.output("blob");
  if (opts.save) opts.save(blob, result.fileName);
  else result.doc.save(result.fileName);
}
const SHEET_QR = {
  symbolMm: 20,
  /** Escalation rung when the generation-time self-check fails. */
  fallbackSymbolMm: 24,
  quietModules: 4,
  /** Left column ↔ QR column gutter. */
  gap: 4,
  caption: "Scan to open the digital copy",
  captionPt: 7,
  /** Block top; the header band ends at 20 mm. */
  top: 21.4,
  /** Caption baseline (below the block, inside the QR column only). */
  captionBaseline: 49.2
};
function fitOneLine(doc, text, width) {
  if (doc.getTextWidth(text) <= width) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}
function sheetHeaderLayout(doc, model, opts, variant = {}) {
  const wantQr = !!opts.qrUrl && opts.includeQr !== false;
  let matrix = null;
  if (wantQr) {
    try {
      matrix = qrMatrix(opts.qrUrl, "M");
    } catch {
      matrix = null;
    }
  }
  let symbolMm = variant.symbolMm ?? SHEET_QR.symbolMm;
  const qrCheck = matrix && opts.qrUrl ? qrSelfCheck(matrix, opts.qrUrl, { symbolMm }) : null;
  if (qrCheck && !qrCheck.ok && symbolMm === SHEET_QR.symbolMm) {
    symbolMm = SHEET_QR.fallbackSymbolMm;
  }
  const qrBlock = matrix ? symbolMm * (matrix.size + SHEET_QR.quietModules * 2) / matrix.size : 0;
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET_QR.captionPt);
  const captionW = doc.getTextWidth(sheetText(SHEET_QR.caption));
  const rightW = matrix ? Math.max(qrBlock, captionW) : qrBlock;
  const leftW = SHEET.content - (rightW > 0 ? rightW + SHEET_QR.gap : 0);
  const name = model.facilityName || "Facility";
  let titleSize = 16;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(titleSize);
  for (const size of [16, 15, 14, 13, 12.5]) {
    doc.setFontSize(size);
    if (doc.getTextWidth(name) <= leftW) {
      titleSize = size;
      break;
    }
    titleSize = size;
  }
  doc.setFontSize(titleSize);
  let titleLines = wrapText(doc, name, leftW).slice(0, 2);
  if (titleLines.length === 1) {
    titleLines = [fitOneLine(doc, name, leftW)];
  } else {
    const rest = wrapText(doc, name, leftW).slice(1).join(" ");
    titleLines = [titleLines[0], fitOneLine(doc, rest, leftW)];
  }
  const twoLine = titleLines.length > 1;
  const titleYs = twoLine ? [38, 42.8] : [39];
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  const subtitleY = twoLine ? 46.6 : 44.4;
  const subtitle = fitOneLine(doc, model.subtitle, leftW);
  const pillY0 = twoLine ? 51.4 : 49.6;
  const chips = [
    { text: model.statusLabel, tone: model.statusTone },
    { text: `#${model.cycleNumber} ${model.cycleType}`, tone: "blue" },
    {
      text: model.validityChip,
      tone: /expired/i.test(model.validityChip) ? "red" : "green"
    }
  ];
  const pileChips = (size, rowGap) => {
    const out = [];
    let rowY = pillY0;
    let x = SHEET.margin;
    doc.setFont(SHEET_FONT, "bold");
    doc.setFontSize(size);
    for (const chip of chips) {
      const w = Math.min(leftW, doc.getTextWidth(sheetText(chip.text)) + 4.4);
      if (x > SHEET.margin && x + w > SHEET.margin + leftW) {
        x = SHEET.margin;
        rowY += rowGap;
      }
      out.push({ text: chip.text, tone: chip.tone, x, y: rowY, w, size });
      x += w + 2.4;
    }
    return { pills: out, lastY: rowY };
  };
  let placed = pileChips(SHEET.min, 4.6);
  let stepperY = Math.max(twoLine ? 57.3 : 55.5, placed.lastY + 5.9);
  let factsY = Math.max(twoLine ? 69.8 : 68, stepperY + 12.5);
  if (factsY + 11 > SHEET_BODY.top1 - 1) {
    placed = pileChips(7, 4.2);
    stepperY = Math.max(twoLine ? 57.3 : 55.5, placed.lastY + 5.6);
    factsY = Math.max(twoLine ? 69.8 : 68, stepperY + 12.25);
  }
  const pills = placed.pills;
  const factsH = Math.max(11, Math.min(14, SHEET_BODY.top1 - 1.2 - factsY));
  let qr = null;
  let caption = null;
  if (matrix && rightW > 0) {
    const qx = SHEET.pageW - SHEET.margin - qrBlock;
    qr = { x: qx, y: SHEET_QR.top, size: qrBlock, symbol: symbolMm, matrix };
    if (!variant.tight) {
      const capX = Math.min(
        Math.max(qx + (qrBlock - captionW) / 2, SHEET.margin + leftW + SHEET_QR.gap),
        SHEET.pageW - SHEET.margin - captionW
      );
      caption = {
        text: SHEET_QR.caption,
        x: capX,
        y: SHEET_QR.captionBaseline,
        w: captionW
      };
    }
  }
  const boxes = [];
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(titleSize);
  titleLines.forEach((line, i) => {
    boxes.push({
      id: `title-${i + 1}`,
      x: SHEET.margin,
      y: titleYs[i] - titleSize * 0.3528 * 0.78,
      w: doc.getTextWidth(line),
      h: titleSize * 0.3528 * 0.95
    });
  });
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(8.5);
  boxes.push({
    id: "subtitle",
    x: SHEET.margin,
    y: subtitleY - 2.3,
    w: doc.getTextWidth(subtitle),
    h: 3.1
  });
  for (const [i, p] of pills.entries()) {
    boxes.push({ id: `pill-${i + 1}`, x: p.x, y: p.y - 3.1, w: p.w, h: 4.2 });
  }
  if (qr) boxes.push({ id: "qr", x: qr.x, y: qr.y, w: qr.size, h: qr.size });
  if (caption)
    boxes.push({
      id: "qr-caption",
      x: caption.x,
      y: caption.y - 2.4,
      w: caption.w,
      h: 3.2
    });
  return {
    leftW,
    rightW,
    titleLines,
    titleSize,
    titleYs,
    subtitle,
    subtitleY,
    pills,
    qr,
    caption,
    stepperY,
    factsY,
    factsH,
    boxes,
    qrCheck
  };
}
function headerBoxViolations(boxes) {
  const out = [];
  for (const b of boxes) {
    if (b.x < SHEET.margin - 0.01 || b.x + b.w > SHEET.pageW - SHEET.margin + 0.01) {
      out.push(`${b.id} leaves the content width (${b.x.toFixed(1)}–${(b.x + b.w).toFixed(1)}mm)`);
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const hit = a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
      if (hit) out.push(`${a.id} overlaps ${b.id}`);
    }
  }
  return out;
}
function slimHeaderLayout(doc, model) {
  const meta = `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber} · ${model.isCurrentCycle ? "Current" : "As recorded"}`;
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  const metaW = doc.getTextWidth(meta);
  const leftW = SHEET.content - metaW - 4;
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(9);
  const name = fitOneLine(doc, model.facilityName || "Facility", leftW);
  return {
    name,
    nameBox: { id: "p2-name", x: SHEET.margin, y: 3.6, w: doc.getTextWidth(name), h: 4.4 },
    metaBox: {
      id: "p2-meta",
      x: SHEET.pageW - SHEET.margin - metaW,
      y: 3.6,
      w: metaW,
      h: 4.4
    }
  };
}
function headerBand(doc, model, opts) {
  doc.setFillColor(13, 105, 96);
  doc.rect(0, 0, SHEET.pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(12);
  doc.text("NQAS STATUS REPORT", SHEET.margin, 7.4);
  doc.setFontSize(8.5);
  doc.text(sheetText(model.cycleHeading), SHEET.margin, 12.6);
  if (!model.isCurrentCycle) {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min - 0.5);
    doc.text(sheetText(`As recorded · ${model.cycleStartLabel}`), SHEET.margin, 17.4);
  } else {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min - 0.5);
    doc.text(sheetText(`${model.cycleStartLabel} · read-only history for earlier cycles`), SHEET.margin, 17.4);
  }
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(sheetText(opts.department ?? DEPARTMENT), SHEET.pageW - SHEET.margin, 7.4, { align: "right" });
  doc.text(`Generated ${model.generatedAt}`, SHEET.pageW - SHEET.margin, 12.6, { align: "right" });
  doc.text("Facility profile sheet", SHEET.pageW - SHEET.margin, 17.4, { align: "right" });
  doc.setTextColor(15, 23, 42);
}
function slimHeader(doc, model, opts) {
  doc.setFillColor(13, 105, 96);
  doc.rect(0, 0, SHEET.pageW, 10, "F");
  doc.setTextColor(255, 255, 255);
  const slim = slimHeaderLayout(doc, model);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(9);
  doc.text(sheetText(slim.name), SHEET.margin, 6.6);
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(
    `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber} · ${model.isCurrentCycle ? "Current" : "As recorded"}`,
    SHEET.pageW - SHEET.margin,
    6.6,
    { align: "right" }
  );
  doc.setTextColor(15, 23, 42);
}
const STEPPER = {
  /* The CURRENT stage draws a 2.6 mm ring, so the token is the largest
     radius: circle edge → label top is then 1.6 mm for every stage. */
  circleR: 2.6,
  circleToLabel: 1.6,
  labelPt: 8.5,
  labelLinePt: 10.5,
  labelToDate: 0.6,
  datePt: 7.5,
  dateLinePt: 9,
  /** 1 pt = 0.3528 mm. */
  labelAscent: 8.5 * 0.3528 * 0.75,
  dateAscent: 7.5 * 0.3528 * 0.75
};
function stepperTextBaselines(y) {
  const labelTop = y + STEPPER.circleR + STEPPER.circleToLabel;
  const labelBlock = STEPPER.labelLinePt * 0.3528;
  return {
    label: labelTop + STEPPER.labelAscent,
    date: labelTop + labelBlock + STEPPER.labelToDate + STEPPER.dateAscent
  };
}
function drawStepper(doc, stages, y) {
  const n = stages.length;
  const stepW = SHEET.content / n;
  const { label: labelBaseline, date: dateBaseline } = stepperTextBaselines(y);
  stages.forEach((s, i) => {
    const cx = SHEET.margin + stepW * i + stepW / 2;
    const done = s.state === "done";
    const current = s.state === "current";
    const blocked = s.state === "blocked";
    if (i < n - 1) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.line(
        cx + STEPPER.circleR + 1.4,
        y,
        cx + stepW - STEPPER.circleR - 1.4,
        y
      );
    }
    const tone = blocked ? [185, 28, 28] : done ? [4, 120, 87] : current ? [3, 105, 161] : [203, 213, 225];
    doc.setFillColor(...tone);
    doc.setDrawColor(...tone);
    doc.setLineWidth(0.3);
    if (current) {
      doc.circle(cx, y, 2.6, "FD");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, y, 1.1, "F");
    } else {
      doc.circle(cx, y, 1.9, done || blocked ? "FD" : "S");
    }
    doc.setFont(SHEET_FONT, done || current ? "bold" : "normal");
    let size = STEPPER.labelPt;
    let spacing = 0;
    doc.setFontSize(size);
    const natural = doc.getTextWidth(s.label);
    const maxW = stepW - 2;
    if (natural > maxW) {
      spacing = Math.max(-0.16, (maxW - natural) / Math.max(1, s.label.length - 1));
      if (natural + spacing * (s.label.length - 1) > maxW) size = 8;
    }
    doc.setFontSize(size);
    doc.setCharSpace(size === STEPPER.labelPt ? spacing : 0);
    doc.setTextColor(done || current || blocked ? 15 : 148, done || current || blocked ? 23 : 163, done || current || blocked ? 42 : 184);
    doc.text(s.label, cx, labelBaseline, { align: "center" });
    doc.setCharSpace(0);
    if (s.date) {
      doc.setFont(SHEET_FONT, "normal");
      doc.setFontSize(STEPPER.datePt);
      doc.setTextColor(100, 116, 139);
      doc.text(s.date, cx, dateBaseline, { align: "center" });
    }
  });
  doc.setTextColor(0, 0, 0);
}
function drawFacts(doc, facts, y, height = 14) {
  const gap = 3.2;
  const w = (SHEET.content - gap * (facts.length - 1)) / facts.length;
  facts.forEach((f, i) => {
    const x = SHEET.margin + i * (w + gap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y, w, height, 1.4, 1.4, "FD");
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min);
    doc.setTextColor(100, 116, 139);
    doc.text(wrapText(doc, f.label, w - 3)[0] ?? "", x + 1.5, y + 4);
    doc.setFont(SHEET_FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const valueLines = wrapText(doc, f.value, w - 3);
    valueLines.slice(0, 2).forEach((l, li) => doc.text(l, x + 1.5, y + 8.4 + li * 3.2));
  });
  doc.setTextColor(0, 0, 0);
}
function measureIaCard(_doc, model, w = SHEET.content, chartMm = IA_CARD.chartMm) {
  if (model.iaChart.points.length === 0) return 13;
  return 5.4 + layoutIaCard(model.iaChart.points, model.iaChart.change, { width: w, chartMm }).height;
}
const IA_SERIES = IA_SERIES$1;
function drawIaCard(doc, model, y, chartMm = 44) {
  const chart = model.iaChart;
  const w = SHEET.content;
  const h = measureIaCard(doc, model, w, chartMm);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  doc.rect(SHEET.margin, y, w, h, "S");
  doc.setFillColor(13, 105, 96);
  doc.rect(SHEET.margin, y, w, 5.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.min);
  doc.text("INTERNAL ASSESSMENT & KAYAKALP — LAST FOUR QUARTERS", SHEET.margin + 2.2, y + 3.7);
  doc.setFont(SHEET_FONT, "normal");
  doc.setTextColor(0, 0, 0);
  if (chart.points.length === 0) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(
      sheetText(chart.note || "No internal assessment scores reported"),
      SHEET.margin + 2.2,
      y + 9.6
    );
    doc.setTextColor(0, 0, 0);
    return y + h;
  }
  const layout = layoutIaCard(chart.points, chart.change, {
    width: w,
    chartMm,
    decimals: SCORE_DECIMALS
  });
  const X = SHEET.margin;
  const Y = y + 5.4;
  const rowH = IA_CARD.rowH;
  const headerY = Y + layout.tableTop;
  doc.setFillColor(241, 245, 249);
  doc.rect(X, headerY, w, rowH, "F");
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(71, 85, 105);
  doc.text("Tracker", X + layout.labelX, headerY + 2.8);
  layout.quarters.forEach((q) => {
    doc.text(q.point.shortLabel, X + q.centre, headerY + 2.8, { align: "center" });
  });
  doc.text("Change", X + layout.changeRight - 1.2, headerY + 2.8, { align: "right" });
  const scoreCell = (v) => v == null ? "Not reported" : scoreText(v);
  IA_SERIES.forEach((series, s) => {
    const ry = headerY + rowH + s * rowH;
    if (s % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(X, ry, w, rowH, "F");
    }
    doc.setFont(SHEET_FONT, "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(series.label, X + layout.labelX, ry + 2.8);
    doc.setFont(SHEET_FONT, "normal");
    layout.quarters.forEach((q) => {
      const value = series.key === "nqas" ? q.point.nqas : q.point.kayakalp;
      doc.setTextColor(value == null ? 148 : 15, value == null ? 163 : 23, value == null ? 184 : 42);
      doc.text(scoreCell(value), X + q.x1 - 2, ry + 2.8, { align: "right" });
    });
    const delta = series.key === "nqas" ? chart.change.nqas : chart.change.kayakalp;
    const mark = changeMark(delta);
    const cx = X + layout.changeRight - 1.2;
    if (mark && delta != null) {
      drawChangeMark(
        doc,
        cx - doc.getTextWidth(iaChangeText(delta, SCORE_DECIMALS).replace(/^[^0-9]+/, "")) - 2.6,
        ry + 2.4,
        mark,
        TONES[mark === "flat" ? "grey" : mark === "up" ? "green" : "red"]
      );
      doc.setTextColor(15, 23, 42);
      doc.text(`${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`, cx, ry + 2.8, { align: "right" });
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text(DASH, cx, ry + 2.8, { align: "right" });
    }
  });
  const plotX0 = X + layout.labelX;
  const plotX1 = X + w - 3.2;
  const plotTop = Y + layout.plotTop;
  const plotBottom = Y + layout.plotBottom;
  const plotH = plotBottom - plotTop;
  const yOf = (v) => plotBottom - Math.max(0, Math.min(100, v)) / 100 * plotH;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.12);
  for (const v of [0, 50, 100]) doc.line(plotX0, yOf(v), plotX1, yOf(v));
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(100, 116, 139);
  for (const v of [0, 50, 100]) doc.text(String(v), plotX0 - 1, yOf(v) + 1, { align: "right" });
  doc.text("Score %", plotX0, plotTop - 1.2);
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1.4, 1], 0);
  doc.line(plotX0, yOf(70), plotX1, yOf(70));
  doc.setLineDashPattern([], 0);
  doc.setFont(SHEET_FONT, "bold");
  doc.setTextColor(180, 83, 9);
  doc.text("70", plotX0 - 1, yOf(70) - 1, { align: "right" });
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(71, 85, 105);
  layout.quarters.forEach((q) => {
    doc.text(q.point.shortLabel, X + q.centre, plotBottom + 3.6, { align: "center" });
  });
  const hatchBar = (bx, by, bw, bh) => {
    if (bw <= 0 || bh <= 0) return;
    doc.setFillColor(255, 247, 237);
    doc.rect(bx, by, bw, bh, "F");
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.22);
    for (let t = 0.8; t < bw + bh; t += 1.35) {
      const x1 = Math.max(0, t - bh);
      const x2 = Math.min(bw, t);
      if (x2 <= x1) continue;
      doc.line(bx + x1, by + (t - x1), bx + x2, by + (t - x2));
    }
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.25);
    doc.rect(bx, by, bw, bh, "S");
  };
  layout.bars.forEach((bar) => {
    if (bar.value == null || bar.h <= 0) return;
    const bx = X + bar.x;
    const by = Y + bar.y;
    if (bar.series === "kayakalp") hatchBar(bx, by, bar.w, bar.h);
    else {
      doc.setFillColor(15, 118, 110);
      doc.rect(bx, by, bar.w, bar.h, "F");
    }
  });
  layout.emptySlots.forEach((slot) => {
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    if (slot.text === "Not reported") {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(X + slot.x - slot.width / 2, plotBottom, X + slot.x + slot.width / 2, plotBottom);
      doc.setLineDashPattern([], 0);
    }
    doc.text(slot.text, X + slot.x, Y + slot.y, { align: "center" });
  });
  layout.labels.forEach((label) => {
    doc.setFont(SHEET_FONT, label.bold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(label.kind === "inside" ? 255 : 15, label.kind === "inside" ? 255 : 23, label.kind === "inside" ? 255 : 42);
    doc.text(label.text, X + label.x, Y + label.y, { align: "center" });
  });
  const midY = plotTop + plotH / 2;
  [
    { key: "nqas", y: midY - 1.2 },
    { key: "kayakalp", y: midY + 3.2 }
  ].forEach(({ key, y: cy }) => {
    const delta = key === "nqas" ? chart.change.nqas : chart.change.kayakalp;
    const mark = changeMark(delta);
    const cx = X + layout.changeRight - 1.2;
    if (!mark || delta == null) {
      doc.setFont(SHEET_FONT, "normal");
      doc.setFontSize(SHEET.min);
      doc.setTextColor(148, 163, 184);
      doc.text(DASH, cx, cy + 0.6, { align: "right" });
      return;
    }
    const text = `${delta > 0 ? "+" : ""}${delta.toFixed(SCORE_DECIMALS)}`;
    doc.setFont(SHEET_FONT, "normal");
    doc.setFontSize(SHEET.min);
    drawChangeMark(
      doc,
      cx - doc.getTextWidth(text) - 2.4,
      cy + 0.3,
      mark,
      TONES[mark === "flat" ? "grey" : mark === "up" ? "green" : "red"]
    );
    doc.setTextColor(15, 23, 42);
    doc.text(text, cx, cy + 0.6, { align: "right" });
  });
  const legendY = Y + layout.legendY + 2;
  doc.setFillColor(15, 118, 110);
  doc.rect(X + IA_CARD.pad, legendY - 2.2, 3, 3, "F");
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("NQAS IA", X + IA_CARD.pad + 4.2, legendY);
  hatchBar(X + IA_CARD.pad + 22, legendY - 2.2, 3, 3);
  doc.setTextColor(71, 85, 105);
  doc.text("Kayakalp IA", X + IA_CARD.pad + 26.2, legendY);
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.4, 1], 0);
  doc.line(X + IA_CARD.pad + 47, legendY - 0.8, X + IA_CARD.pad + 54, legendY - 0.8);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(71, 85, 105);
  doc.text("Target 70", X + IA_CARD.pad + 55, legendY);
  if (chart.note) {
    doc.setFont(SHEET_FONT, "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(sheetText(chart.note), X + w - IA_CARD.pad, Y + layout.noteY, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
  return y + h;
}
function drawPackedColumn(doc, model, items, x, y, size, showEmpty, step) {
  let cursor = y;
  for (const item of items) {
    const cardOpts = {
      tight: step.tight,
      clamp: step.clamp,
      hideMissingLine: step.collapseBlanks
    };
    const layout = measureCard(doc, item.card, x, cursor, SHEET.colW, size, showEmpty, cardOpts);
    drawCard(doc, layout, x, cursor, SHEET.colW, size, showEmpty, cardOpts);
    cursor += item.height;
  }
  return cursor;
}
function cardTexts(card) {
  const out = [card.title];
  for (const row of card.rows) {
    if (row.label) out.push(row.label);
    if (row.value) out.push(row.value);
    if (row.mini) {
      out.push(row.mini.previousLabel, row.mini.latestLabel);
      for (const m of row.mini.rows) out.push(m.name);
    }
  }
  return out;
}
function drawRecent(doc, recent, y) {
  const w = SHEET.content;
  doc.setFillColor(241, 245, 249);
  doc.rect(SHEET.margin, y, w, 6, "F");
  doc.setFont(SHEET_FONT, "bold");
  doc.setFontSize(SHEET.body);
  doc.setTextColor(15, 23, 42);
  doc.text("RECENT CHANGES", SHEET.margin + 2.4, y + 4);
  let cursor = y + 9;
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  for (const r of recent) {
    doc.setTextColor(71, 85, 105);
    doc.text(r.when, SHEET.margin + 2.4, cursor);
    doc.text(r.who.slice(0, 20), SHEET.margin + 38, cursor);
    doc.setTextColor(13, 105, 96);
    doc.text(r.cycle, SHEET.margin + 62, cursor);
    doc.setTextColor(15, 23, 42);
    const lines = wrapText(doc, r.what, w - 80);
    doc.text(lines[0] ?? "", SHEET.margin + 72, cursor);
    cursor += 5.4;
  }
  doc.setTextColor(0, 0, 0);
  return cursor + 2;
}
function drawMeta(doc, meta, y) {
  const w = SHEET.content;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(SHEET.margin, y, w, 4, "F");
  let cursor = y + 7;
  doc.setFontSize(SHEET.label);
  for (const m of meta) {
    if (!m.value) continue;
    doc.setFont(SHEET_FONT, "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${m.label}:`, SHEET.margin + 2.4, cursor);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(SHEET.body);
    const lines = wrapText(doc, m.value, w - 44);
    lines.forEach((l, i) => doc.text(l, SHEET.margin + 42, cursor + i * 3.4));
    cursor += Math.max(1, lines.length) * 3.4 + 1.6;
    doc.setFontSize(SHEET.label);
  }
  doc.setTextColor(0, 0, 0);
  return cursor;
}
function footer(doc, model, page, total, opts) {
  const y = SHEET.pageH - 6.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(SHEET.margin, y - 4.4, SHEET.pageW - SHEET.margin, y - 4.4);
  doc.setFont(SHEET_FONT, "normal");
  doc.setFontSize(SHEET.min);
  doc.setTextColor(100, 116, 139);
  const line = sheetText(
    `NIN ${model.nin || DASH} · Cycle #${model.cycleNumber}${model.isCurrentCycle ? "" : " (as recorded)"} · Data as of ${model.dataAsOf} · Page ${page} of ${total}`
  );
  doc.text(line, SHEET.margin, y);
  doc.setFontSize(SHEET.min - 0.5);
  doc.text(sheetText(CONFIDENTIAL), SHEET.pageW - SHEET.margin, y - 4, { align: "right" });
}

export { LABEL_SHARE, SHEET, SHEET_BODY, SHEET_CARD_PRIORITY, SHEET_DOCUMENTS, SHEET_DROPPABLE, SHEET_PAGE1_LEFT, SHEET_PAGE1_RIGHT, SHEET_PAGE2_CARDS, SHEET_QR, STEPPER, assessmentScoreText, buildCycleSheetModel, buildFacilitySheet, buildSheetModel, changeMark, chooseFit, cycleEndIso, cycleMasterRow, cycleStartIso, dateRangePlain, dateRangeText, drawCard, drawIaCard, durationText, exportFacilitySheet, facilityCycles, fyQuarterOf, headerBoxViolations, iaChartFor, isSheetSafe, istStamp, layoutSheet, loadSheetFonts, measureCard, measureIaCard, money, overlapViolations, scoreText, sheetBoxes, sheetHeaderLayout, sheetLadder, sheetText, slimHeaderLayout, stepperTextBaselines, unsupportedSheetGlyphs, wrapText };

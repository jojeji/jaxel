// Datei-I/O mit Encoding-Erkennung (docs/entscheidungen.md #9): BOM zuerst,
// sonst die `encoding="..."`-Angabe in einer XML-Deklaration, sonst UTF-8 — oder windows-1252,
// wenn die Bytes kein gültiges UTF-8 sind.

use encoding_rs::Encoding;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

/// Cheap file identity for external-change detection (docs/entscheidungen.md 2026-07-18 #4):
/// mtime + size, not a full re-read — files can be several 100 MB (see docs/architektur.md).
pub struct FileStat {
    pub mtime_ms: u64,
    pub size: u64,
}

fn stat_of(path: &Path) -> Result<FileStat, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let mtime_ms = metadata
        .modified()
        .map_err(|error| error.to_string())?
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis() as u64;
    Ok(FileStat {
        mtime_ms,
        size: metadata.len(),
    })
}

pub struct DecodedFile {
    pub content: String,
    pub encoding: String,
    /// The file started with a byte order mark. Decoding strips it from `content`; saving puts it
    /// back (see `write_text_file`), so a save without edits reproduces the file byte for byte.
    pub bom: bool,
    pub stat: FileStat,
}

fn sniff_xml_declared_encoding(bytes: &[u8]) -> Option<&'static Encoding> {
    // Die XML-Deklaration ist reines ASCII und steht immer am Dateianfang;
    // ein einfacher Byte-Scan der ersten 200 Bytes reicht. Nur die Deklaration selbst wird als
    // Text gelesen: Was danach kommt, ist in der deklarierten Kodierung (etwa ein Latin-1-„ä“)
    // und kein gültiges UTF-8 — prüfte man die ganzen 200 Bytes, fiele eine solche Datei still
    // auf UTF-8 zurück und verlöre beim Speichern jeden Umlaut.
    let head = &bytes[..bytes.len().min(200)];
    let decl_end = head.windows(2).position(|pair| pair == b"?>")?;
    let decl = std::str::from_utf8(&head[..decl_end]).ok()?;
    let key = "encoding=";
    let start = decl.find(key)? + key.len();
    let quote = decl.as_bytes().get(start).copied()?;
    if quote != b'"' && quote != b'\'' {
        return None;
    }
    let rest = &decl[start + 1..];
    let end = rest.find(quote as char)?;
    let declared = Encoding::for_label(rest[..end].as_bytes())?;
    // We just read the declaration as ASCII bytes, so the file cannot be UTF-16 (whose ASCII
    // characters would be interleaved with NUL bytes). Such files are common — .NET writes UTF-8
    // bytes declaring "utf-16" — and the WHATWG encoding standard reads them as UTF-8 too. A real
    // UTF-16 file carries a BOM and never reaches this sniff (see `detect_encoding`).
    if declared == encoding_rs::UTF_16LE || declared == encoding_rs::UTF_16BE {
        return Some(encoding_rs::UTF_8);
    }
    Some(declared)
}

fn detect_encoding(bytes: &[u8]) -> &'static Encoding {
    if let Some((encoding, _bom_len)) = Encoding::for_bom(bytes) {
        return encoding;
    }
    if let Some(declared) = sniff_xml_declared_encoding(bytes) {
        return declared;
    }
    // Nothing declared: UTF-8 if the bytes are valid UTF-8. Otherwise the file is almost surely
    // in the Windows code page (Latin-1 and friends, as older Windows tools write XML and JSON
    // without a declaration). Decoding it as UTF-8 would replace every umlaut with U+FFFD — in
    // the whole file, untouched nodes included, the moment it is saved.
    if std::str::from_utf8(bytes).is_ok() {
        encoding_rs::UTF_8
    } else {
        encoding_rs::WINDOWS_1252
    }
}

/// Text → bytes in `encoding`, with a BOM if `bom`. encoding_rs cannot do this alone: its
/// `encode` writes UTF-8 when asked for UTF-16 (it only decodes UTF-16) and never writes a BOM.
fn encode(content: &str, encoding: &'static Encoding, bom: bool) -> Vec<u8> {
    if encoding == encoding_rs::UTF_16LE || encoding == encoding_rs::UTF_16BE {
        let little_endian = encoding == encoding_rs::UTF_16LE;
        // Always with BOM: without one, `detect_encoding` could not recognise UTF-16 again (the
        // XML declaration would not be ASCII bytes), so Jaxel could not reopen its own file.
        let mut bytes = if little_endian { vec![0xFF, 0xFE] } else { vec![0xFE, 0xFF] };
        for unit in content.encode_utf16() {
            bytes.extend_from_slice(&if little_endian { unit.to_le_bytes() } else { unit.to_be_bytes() });
        }
        return bytes;
    }
    let mut bytes = if bom && encoding == encoding_rs::UTF_8 { vec![0xEF, 0xBB, 0xBF] } else { Vec::new() };
    bytes.extend_from_slice(&encoding.encode(content).0);
    bytes
}

pub fn read_text_file(path: &Path) -> Result<DecodedFile, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let encoding = detect_encoding(&bytes);
    let bom = Encoding::for_bom(&bytes).is_some();
    let (content, _actual_encoding, _had_errors) = encoding.decode(&bytes);
    let stat = stat_of(path)?;
    Ok(DecodedFile {
        content: content.into_owned(),
        encoding: encoding.name().to_string(),
        bom,
        stat,
    })
}

pub fn write_text_file(path: &Path, content: &str, encoding_name: &str, bom: bool) -> Result<FileStat, String> {
    let encoding = Encoding::for_label(encoding_name.as_bytes()).unwrap_or(encoding_rs::UTF_8);
    fs::write(path, encode(content, encoding, bom)).map_err(|error| error.to_string())?;
    stat_of(path)
}

/// Used for the external-change check (Fenster-Fokus-Wiedergewinn, siehe App.tsx) — metadata
/// only, deliberately no content read.
pub fn stat_file(path: &Path) -> Result<FileStat, String> {
    stat_of(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_utf8_bom_regardless_of_content() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"<root/>");
        assert_eq!(detect_encoding(&bytes).name(), "UTF-8");
    }

    #[test]
    fn detects_utf16le_bom() {
        let bytes = [0xFF, 0xFE, b'<', 0, b'a', 0];
        assert_eq!(detect_encoding(&bytes).name(), "UTF-16LE");
    }

    #[test]
    fn reads_undeclared_latin1_as_windows_1252_and_keeps_umlauts_on_save() {
        let bytes = b"<a><b>M\xFCller</b><c>x</c></a>";
        assert_eq!(detect_encoding(bytes).name(), "windows-1252");
        let (content, _, _) = detect_encoding(bytes).decode(bytes);
        assert_eq!(content, "<a><b>M\u{fc}ller</b><c>x</c></a>");
        let edited = content.replace("<c>x</c>", "<c>y</c>");
        assert_eq!(encode(&edited, detect_encoding(bytes), false), b"<a><b>M\xFCller</b><c>y</c></a>".to_vec());
    }

    #[test]
    fn keeps_undeclared_valid_utf8_as_utf8() {
        assert_eq!(detect_encoding("<a>Müller</a>".as_bytes()).name(), "UTF-8");
    }

    #[test]
    fn sniffs_declared_encoding_from_xml_prolog() {
        let bytes = b"<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "windows-1252"); // encoding_rs' ISO-8859-1 alias
    }

    #[test]
    fn sniffs_the_declaration_even_when_non_ascii_text_follows_within_200_bytes() {
        let bytes = b"<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><a>\xE4\xF6\xFC</a>";
        assert_eq!(detect_encoding(bytes).name(), "windows-1252");
    }

    #[test]
    fn reads_a_declared_utf16_file_with_ascii_bytes_as_utf8() {
        // .NET's XmlSerializer + StringWriter writes exactly this: UTF-8 bytes declaring UTF-16.
        // A declaration readable as ASCII bytes cannot be UTF-16 (which would interleave NULs).
        let bytes = b"<?xml version=\"1.0\" encoding=\"utf-16\"?><root>\xC3\xA4</root>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
        let (text, _, _) = detect_encoding(bytes).decode(bytes);
        assert!(text.ends_with("<root>ä</root>"));
    }

    #[test]
    fn accepts_single_quotes_around_the_declared_encoding() {
        let bytes = b"<?xml version='1.0' encoding='UTF-16'?><root/>";
        assert!(sniff_xml_declared_encoding(bytes).is_some());
    }

    #[test]
    fn falls_back_to_utf8_without_a_bom_or_declaration() {
        let bytes = b"<root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn falls_back_to_utf8_when_the_declaration_has_no_encoding_attribute() {
        let bytes = b"<?xml version=\"1.0\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn falls_back_to_utf8_when_the_encoding_value_is_unquoted() {
        // Malformed prolog (no opening quote after "encoding=") — must not panic, must not
        // misparse; sniffing simply finds nothing usable.
        let bytes = b"<?xml version=\"1.0\" encoding=UTF-16?><root/>";
        assert!(sniff_xml_declared_encoding(bytes).is_none());
    }

    #[test]
    fn falls_back_to_utf8_when_the_declared_label_is_unknown() {
        let bytes = b"<?xml version=\"1.0\" encoding=\"not-a-real-encoding\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn only_scans_the_first_200_bytes() {
        // A declaration starting past byte 200 must not be found — matches the doc comment's
        // "reicht ein Scan der ersten 200 Bytes" assumption for where the XML declaration lives.
        let padding = " ".repeat(250);
        let bytes = format!("<!--{padding}--><?xml version=\"1.0\" encoding=\"UTF-16\"?><root/>");
        assert!(sniff_xml_declared_encoding(bytes.as_bytes()).is_none());
    }

    #[test]
    fn a_bom_wins_over_a_conflicting_xml_declaration() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"<?xml version=\"1.0\" encoding=\"UTF-16\"?><root/>");
        assert_eq!(detect_encoding(&bytes).name(), "UTF-8");
    }

    /// Writes `bytes`, reads them like Jaxel does, saves the text back unchanged, and returns
    /// what ended up on disk — a save without edits must reproduce the file byte for byte.
    fn round_trip(name: &str, bytes: &[u8]) -> Vec<u8> {
        let path = std::env::temp_dir().join(format!("jaxel-io-{}-{name}", std::process::id()));
        fs::write(&path, bytes).unwrap();
        let decoded = read_text_file(&path).unwrap();
        write_text_file(&path, &decoded.content, &decoded.encoding, decoded.bom).unwrap();
        let written = fs::read(&path).unwrap();
        fs::remove_file(&path).ok();
        written
    }

    fn utf16(text: &str, little_endian: bool) -> Vec<u8> {
        let mut bytes = if little_endian { vec![0xFF, 0xFE] } else { vec![0xFE, 0xFF] };
        for unit in text.encode_utf16() {
            bytes.extend_from_slice(&if little_endian { unit.to_le_bytes() } else { unit.to_be_bytes() });
        }
        bytes
    }

    #[test]
    fn keeps_utf16le_with_its_bom() {
        let original = utf16("<?xml version=\"1.0\" encoding=\"UTF-16\"?><a>ä€</a>", true);
        assert_eq!(round_trip("u16le.xml", &original), original);
    }

    #[test]
    fn keeps_utf16be_with_its_bom() {
        let original = utf16("<a>ä€</a>", false);
        assert_eq!(round_trip("u16be.xml", &original), original);
    }

    #[test]
    fn keeps_the_utf8_bom() {
        let mut original = vec![0xEF, 0xBB, 0xBF];
        original.extend_from_slice("<a>ä</a>".as_bytes());
        assert_eq!(round_trip("u8bom.xml", &original), original);
    }

    #[test]
    fn adds_no_bom_to_plain_utf8() {
        let original = "<a>ä</a>".as_bytes().to_vec();
        assert_eq!(round_trip("u8.xml", &original), original);
    }

    #[test]
    fn keeps_a_declared_single_byte_encoding() {
        let original = b"<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><a>\xE4</a>".to_vec();
        assert_eq!(round_trip("latin1.xml", &original), original);
    }

}

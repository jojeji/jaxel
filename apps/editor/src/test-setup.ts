import "@testing-library/jest-dom/vitest";
// Die echten Styles gehören in den UI-Test: Farben, Layout und Sichtbarkeit sind Teil dessen,
// was getestet wird (Kommentarfarbe je Theme, Zeilenhöhe der Virtualisierung). Ohne diesen
// Import liefe der Browser-Test auf ungestyltem HTML — also am Fehlerbild vorbei.
import "./styles.css";

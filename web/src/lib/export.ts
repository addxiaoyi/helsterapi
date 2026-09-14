// Re-export of the shared IO helpers. Other modules alias this to keep
// their import paths stable while the implementation lives in `io.ts`.
export {
  rowsToCsv,
  downloadCsv,
  downloadJson,
  readFileAsText,
  parseCsv,
  importCsvAsRecords,
  pickFile,
  type CsvColumn,
  type CsvImporterOptions,
} from "./io";

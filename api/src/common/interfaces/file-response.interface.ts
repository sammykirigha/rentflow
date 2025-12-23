import { Readable } from 'stream';

export interface FileMetaData {
  originalFilename: string | undefined;
  contentType: string;
  contentLength: number;
  contentDisposition?: string;
}

export interface FileResponse {
  metaData: FileMetaData;
  fileStream: Readable;
}
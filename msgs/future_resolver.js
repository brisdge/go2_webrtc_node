import { DATA_CHANNEL_TYPE } from '../constants.js';
import { getNestedField } from '../util.js';

class FutureResolver {
  constructor() {
    this.pendingResponses = {};
    this.pendingCallbacks = {};
    this.chunkDataStorage = {};
  }

  saveResolve(messageType, topic, future, identifier) {
    const key = this.generateMessageKey(messageType, topic, identifier);
    if (key in this.pendingCallbacks) {
      this.pendingCallbacks[key].push(future);
    } else {
      this.pendingCallbacks[key] = [future];
    }
  }

  runResolveForTopic(message) {
    if (!message.type) {
      return;
    }

    if (message.type === DATA_CHANNEL_TYPE.RTC_INNER_REQ && getNestedField(message, 'info', 'req_type') === 'request_static_file') {
      this.runResolveForTopicForFile(message);
      return;
    }

    const key = this.generateMessageKey(
      message.type,
      message.topic || '',
      getNestedField(message, 'data', 'uuid') ||
      getNestedField(message, 'data', 'header', 'identity', 'id') ||
      getNestedField(message, 'info', 'uuid') ||
      getNestedField(message, 'info', 'req_uuid')
    );

    const contentInfo = getNestedField(message, 'data', 'content_info');
    if (contentInfo && contentInfo.enable_chunking) {
      const chunkIndex = contentInfo.chunk_index;
      const totalChunks = contentInfo.total_chunk_num;

      if (totalChunks === null || totalChunks === 0) {
        throw new Error('Total number of chunks cannot be zero');
      }
      if (chunkIndex === null) {
        throw new Error('Chunk index is missing');
      }

      const dataChunk = message.data.data;
      if (chunkIndex < totalChunks) {
        if (key in this.chunkDataStorage) {
          this.chunkDataStorage[key].push(dataChunk);
        } else {
          this.chunkDataStorage[key] = [dataChunk];
        }
        return;
      } else {
        this.chunkDataStorage[key].push(dataChunk);
        message.data.data = this.mergeArrayBuffers(this.chunkDataStorage[key]);
        delete this.chunkDataStorage[key];
      }
    }

    if (key in this.pendingCallbacks) {
      for (const future of this.pendingCallbacks[key]) {
        if (future) {
          future.setResult(message);
        }
      }
      delete this.pendingCallbacks[key];
    }
  }

  mergeArrayBuffers(buffers) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const mergedBuffer = Buffer.alloc(totalLength);

    let currentPosition = 0;
    for (const buffer of buffers) {
      buffer.copy(mergedBuffer, currentPosition);
      currentPosition += buffer.length;
    }

    return mergedBuffer;
  }

  runResolveForTopicForFile(message) {
    const key = this.generateMessageKey(
      message.type,
      message.topic || '',
      getNestedField(message, 'data', 'uuid') ||
      getNestedField(message, 'data', 'header', 'identity', 'id') ||
      getNestedField(message, 'info', 'uuid') ||
      getNestedField(message, 'info', 'req_uuid')
    );

    const fileInfo = getNestedField(message, 'info', 'file');
    if (fileInfo && fileInfo.enable_chunking) {
      const chunkIndex = fileInfo.chunk_index;
      const totalChunks = fileInfo.total_chunk_num;

      if (totalChunks === null || totalChunks === 0) {
        throw new Error('Total number of chunks cannot be zero');
      }
      if (chunkIndex === null) {
        throw new Error('Chunk index is missing');
      }

      const dataChunk = fileInfo.data;

      if (!(key in this.chunkDataStorage)) {
        this.chunkDataStorage[key] = [];
      }

      this.chunkDataStorage[key].push(Buffer.isBuffer(dataChunk) ? dataChunk : Buffer.from(dataChunk, 'utf-8'));

      if (chunkIndex === totalChunks) {
        message.info.file.data = Buffer.concat(this.chunkDataStorage[key]);
        delete this.chunkDataStorage[key];
      }
    }

    if (key in this.pendingCallbacks) {
      for (const future of this.pendingCallbacks[key]) {
        if (future) {
          future.setResult(message);
        }
      }
      delete this.pendingCallbacks[key];
    }
  }

  generateMessageKey(messageType, topic, identifier) {
    return identifier || `${messageType} $ ${topic}`;
  }
}

export { FutureResolver };

export enum MessageType {
  Success,
  Info,
  Warning,
  Error
}

export interface Message {
  type: MessageType
  message: string,
}

export function instanceOfMessage(object: any): object is Message {
    return 'type' in object && 'message' in object;
}

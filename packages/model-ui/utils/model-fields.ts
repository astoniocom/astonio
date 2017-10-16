import { BaseField } from '@astonio/core';

export type ModelFieldsProcessor = {include?: string[], exclude?: string[]}; // * -- все не использованные ранее поля

export function instanceOfModelFieldsProcessor(object: any): object is ModelFieldsProcessor {
  return ('include' in object && object['include'] instanceof Array) || ('exclude' in object && object['exclude'] instanceof Array);
}


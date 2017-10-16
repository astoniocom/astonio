import {BaseDbFieldParams} from './base';
import {CharField} from './char';
import {Backend} from '../base-backend';

export class EmailField extends CharField {
  internalName = 'EmailField';

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
}
import {CharField} from './char';
import {Backend} from '../base-backend';
import {BaseDbFieldParams} from './base';

export class TextField extends CharField {
  internalName = 'TextField';

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
}
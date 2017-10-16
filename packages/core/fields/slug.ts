import {BaseDbFieldParams} from './base';
import {CharField} from './char';
import {Backend} from '../base-backend';

export class SlugField extends CharField {
  internalName = 'SlugField';

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
}
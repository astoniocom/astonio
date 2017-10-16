import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

export interface LabelParams {
  class?: string,
  forId?:string,
}

@Component({
  selector: 'ast-label',
  templateUrl: './label.html',
//  styleUrls: ['./label.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent implements LabelParams {
  @Input() forId:string;
  @Input() class:string;
}
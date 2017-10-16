import {Component, Input, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';

export interface ButtonComponentParams {
  text?: string,
  default?: boolean,
  image?: string,
  active?: boolean,
}

@Component({
  selector: 'ast-button',
  templateUrl: './button.html',
  //styleUrls: ['./button.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent implements ButtonComponentParams {
  @Input() disabled:boolean = false;
  @Input() text: string;
  @Input() default: boolean;
  @Input() image: string;
  @Input() rightImage: string;
  @Input() active: boolean;

}
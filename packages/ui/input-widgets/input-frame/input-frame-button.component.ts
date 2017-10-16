import {Component, ChangeDetectionStrategy} from '@angular/core';


@Component({
  selector: 'ast-input-frame-button',
  templateUrl: './input-frame-button.html',
//  styleUrls: ['input-frame-button.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ast-input-frame-button',
  }
})
export class InputFrameButtonComponent {

}
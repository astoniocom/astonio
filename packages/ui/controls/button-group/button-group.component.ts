import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {ButtonComponent} from '../button/button.component';

@Component({
  selector: 'ast-button-group',
  templateUrl: './button-group.html',
//  styleUrls: ['./button-group.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonGroupComponent {

}
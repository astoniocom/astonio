import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

@Component({
  selector: 'ast-toolbar',
  templateUrl: './toolbar.html',
//  styleUrls: ['./toolbar.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'style': 'width:100%',
  }
})
export class ToolbarComponent {
  @Input('align') align:'left'|'right' = 'left';
}
import {Component, ViewEncapsulation, Input, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {AstonioUIConfigService} from '../../services/config.service';

@Component({
  selector: 'ast-input-frame',
  templateUrl: './input-frame.html',
//  styleUrls: ['input-frame.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFrameComponent {
  @Input() errors:string[] = [];
  @Input() disabled:boolean = false;
  @Input() noBorder = false;
  errorsShown = false;

  _positions = [
    {
      originX: 'end', overlayX: 'end',
      originY: 'bottom', overlayY: 'top',
    },
    {
      originX: 'end', overlayX: 'end',
      originY: 'top', overlayY: 'bottom',
    },
  ];

  constructor(private cdr:ChangeDetectorRef, protected configService:AstonioUIConfigService) {
    /*     setTimeout(() => {
      this.errors = ['1','2','3']
      this.cdr.detectChanges();
    },3000);*/
  }

  showErrors(show:boolean) {
    //if (show==false) return;
      
    this.errorsShown = show;
    this.cdr.detectChanges();
  }
}
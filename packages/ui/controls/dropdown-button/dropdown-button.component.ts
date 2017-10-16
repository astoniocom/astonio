import {Component, Input, ViewEncapsulation, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {ButtonComponentParams} from '../button/button.component';
import {PopupDispatcher} from '../../services/popup-dispatcher';
import {Subscription} from 'rxjs';
import {AstonioUIConfigService} from '../../services/config.service';

export interface DropdownButtonComponentParams extends ButtonComponentParams {

}

@Component({
  selector: 'ast-dropdown-button',
  templateUrl: './dropdown-button.html',
  //styleUrls: ['./dropdown-button.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [PopupDispatcher,],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownButtonComponent implements OnChanges, OnDestroy {
  noText:boolean = true;
  opened:boolean = false;
  private clickOutsideSubscription:Subscription;
  @Input() disabled:boolean = false;

   _positions = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
    },    
  ];

  constructor(private popupDispatcher:PopupDispatcher, private cdr:ChangeDetectorRef, private configService:AstonioUIConfigService) {
    this.clickOutsideSubscription = popupDispatcher.clickedOuside.subscribe(() => {
      this.close();
    });

    popupDispatcher.picked.subscribe(val => {
      this.close();
    });
  }

  private _text:string;
  _textEx:string = '';
  @Input() set text(value:string) {
    this._text = value;
    this._textEx = (value && value.length) ? value : '';
    this.noText = !(value && value.length);
  }

  get text():string {
    return this._text;
  }

  @Input('params')params:DropdownButtonComponentParams = {
    text: ''
  };

  ngOnChanges(changes:SimpleChanges) {
  }

  ngOnDestroy() {
    this.clickOutsideSubscription.unsubscribe();
  }

  buttonClicked() {
    if (this.disabled)
      return;
    this.toogle();
  }

  buttonMousedown() {
    this.popupDispatcher.clickedInside();
  }

  toogle() {
    this.opened ? this.close() : this.open();
  }

  open() {
    this.opened = true;
    this.popupDispatcher.open();
    this.cdr.detectChanges();
  }

  close() {
    this.opened = false;
    this.popupDispatcher.close();
    this.cdr.detectChanges();
  }
}
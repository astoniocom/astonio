import {EventEmitter, Component,Injector, ViewChild, ViewChildren, ViewContainerRef, QueryList, ElementRef, HostListener, AfterViewInit, OnDestroy, Input,OnInit, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NumberInputWidgetComponent} from '../number-input/number-input-widget.component';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {Subscription} from 'rxjs';
import Inputmask from 'inputmask';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => NumberRangeInputWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-number-range-input',
  templateUrl: './number-range-input-widget.html',
  //styleUrls: ['./number-range-input-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberRangeInputWidgetComponent extends BaseInputWidgetComponent implements AfterViewInit, OnInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  
  //From number-input
  @Input() inputMask:Inputmask; //inputmask object
  @Input() inputMaskParams:Object; // inputmask params
  @Input() groupSeparator: string = ' ';
  @Input() autoGroup: boolean = true;
  @Input() fractionalDigits:number;
  @Input() placeholder:string;
  @Input() prefix:string;
  @Input() suffix:string;
  @Input() allowMinus:boolean = true;
  @Input() min:number;
  @Input() max:number;

  @ViewChild("fromInput") private fromInput: NumberInputWidgetComponent;
  @ViewChild("toInput") private toInput: NumberInputWidgetComponent;
    
  constructor (protected vcr: ViewContainerRef) {
    super(vcr);
    /*setTimeout(() => {
      if (!this.componentInit)
        return;
      this.errors = ['The field is required.','Field can contain only letters and digits.'];
      //if (this.componentInit)
      //  this.cdr.detectChanges();
    }, 2000);*/
  }

  private _fromValue:number = null;
  set fromValue(val:number) {
    if (val === this._fromValue)
      return;

    this._fromValue = val;
    if (this.fromValue === null && this.toValue === null)
      this.value = null;
    else
      this.value = [this.fromValue, this.toValue];
  }

  get fromValue():number {
    return this._fromValue;
  }


  private _toValue:number = null;
  set toValue(val:number) {
    if (val === this._toValue)
      return;

    this._toValue = val;
    if (this.fromValue === null && this.toValue === null)
      this.value = null;
    else
      this.value = [this.fromValue, this.toValue];
  }

  get toValue():number {
    return this._toValue;
  }

  set value(val:[number, number]) {
    if (val === null) {
      this._fromValue = null;
      this._toValue = null;
    }
    else {
      this._fromValue = val[0];
      this._toValue = val[1];
    }

    super.value = val;
  }

  get value():[number, number] {
    return super.value;
  }

  ngOnInit() {
    if (!this.disabled && this.startWithChar && this.startWithChar.length) {
      this.fromValue = parseInt(this.startWithChar);
      
    }
  }
    
  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.disabled) {
      if (this.startWithChar) {
        this.fromInput.setFocus(false);
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.fromInput.setFocus(true);
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  onContainerKeyDown(event:KeyboardEvent):boolean|void {
    var keyCode = event.keyCode;
    if (!this.disabled && [37, 39].indexOf(keyCode) !== -1) {
      return false;
    }

    if (!this.disabled && keyCode === 9 && this.fromInput.isFocused() && !event.shiftKey)
      return false;
    if (!this.disabled && keyCode === 9 && this.toInput.isFocused() && event.shiftKey)
      return false;


  }
 
  setFocus(select=false) {
    //setTimeout(() => {
    if (!this.componentInit || this.disabled)
      return;

    this.fromInput.setFocus(select);
  }
}



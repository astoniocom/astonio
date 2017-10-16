import {EventEmitter, Component,Injector, ViewChild, ViewChildren, ViewContainerRef, ViewEncapsulation, QueryList, ElementRef, HostListener, AfterViewInit, OnDestroy, Input,OnInit, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {DateInputWidgetComponent} from '../date-input/date-input-widget.component';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {Subscription} from 'rxjs';
import Inputmask from 'inputmask';
import * as moment from 'moment';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => DateRangeInputWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-date-range-input',
  templateUrl: './date-range-input-widget.html',
//  styleUrls: ['./date-range-input-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeInputWidgetComponent extends BaseInputWidgetComponent implements AfterViewInit, OnInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  
  //From date-input
  @Input() showTime:boolean = false;


  @ViewChild("fromInput") private fromInput: DateInputWidgetComponent;
  @ViewChild("toInput") private toInput: DateInputWidgetComponent;
    
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

  private _fromValue:Date = null;
  set fromValue(val:Date) {
    if (val == this._fromValue || (val && this._fromValue && val.getTime() === this._fromValue.getTime()))
      return;

    this._fromValue = val;
    if (this.fromValue === null && this.toValue === null)
      this.value = null;
    else
      this.value = [this.fromValue, this.toValue];
  }

  get fromValue():Date {
    return this._fromValue;
  }


  private _toValue:Date = null;
  set toValue(val:Date) {
    if (val == this._fromValue || (val && this._toValue && val.getTime() === this._toValue.getTime()))
      return;

    this._toValue = val;
    if (this.fromValue === null && this.toValue === null)
      this.value = null;
    else
      this.value = [this.fromValue, this.toValue];
  }

  get toValue():Date {
    return this._toValue;
  }

  set value(val:[Date, Date]) {
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

  get value():[Date, Date] {
    return super.value;
  }

  ngOnInit() {
  }
    
  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.disabled) {
      if (this.startWithChar) {
        //this.fromValue = this.startWithChar;
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
    if (!this.disabled && [37, 39, 9].indexOf(keyCode) !== -1) {
      return false;
    }

    /*if (!this.disabled && keyCode === 9 && this.fromInput.isFocused() && !event.shiftKey)
      return false;
    if (!this.disabled && keyCode === 9 && this.toInput.isFocused() && event.shiftKey)
      return false;*/


  }
 
  setFocus(select=false) {
    //setTimeout(() => {
    if (!this.componentInit || this.disabled)
      return;

    this.fromInput.setFocus(select);
  }

  getRepr() {
    var result = '';

    if (this.fromValue) {
      if (this.showTime)
        result += moment(this.fromValue).format("DD.MM.YYYY HH:mm");
      else
        result += moment(this.fromValue).format("DD.MM.YYYY");
    }
    else {
      result += 'null';
    }

    result += ' — ';

    if (this.toValue) {
      if (this.showTime)
        result += moment(this.toValue).format("DD.MM.YYYY HH:mm");
      else
        result += moment(this.toValue).format("DD.MM.YYYY");
    }
    else {
      result += 'null';
    }

    return result;
  }
}



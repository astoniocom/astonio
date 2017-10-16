import {EventEmitter, Component,Injector, HostListener, ElementRef, ViewContainerRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Input, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import * as moment from 'moment';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => DateInputWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-date-input',
  templateUrl: './date-input-widget.html',
//  styleUrls: ['./date-input-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInputWidgetComponent extends BaseInputWidgetComponent implements OnInit, AfterViewInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  @Input() showTime:boolean = false;
  @ViewChild("inputElement") private inputElement: ElementRef;
  expression:string;

  _inputValue:string = '';
  set inputValue(value:string) {
    if (value == this._inputValue)
      return

    this._inputValue = value;
    
    if (value == '')
      this.value = null;
    else {
      this.value = moment(value).toDate();
    }

    if (this.componentInit)
      this.cdr.detectChanges(); /// Изза этого может возникать ошибка
  }

  get inputValue():string {
    return this._inputValue;
  }

  set value(val:Date) {
    if (val == this._value)
      return;
    else if (!(val instanceof Date) || isNaN(val.getTime())) { // Invalid Date
      val = undefined;
    }
    else if (val instanceof Date &&  this._value instanceof Date) {
      if (val.getTime() == this._value.getTime())
        return;
      // Because input field returns date without seconds.
      var d1 = new Date(val.getTime()); 
      var d2 = new Date(this._value.getTime());
      d1.setSeconds(0, 0);
      d2.setSeconds(0, 0);
      if (d1.getTime() == d2.getTime())
        return;
    }

    super.value = val;

    if (val == null)
      this.inputValue = '';  
    else {
      this.inputValue = this.showTime ? moment(val).format("YYYY-MM-DDTHH:mm") : moment(val).format("YYYY-MM-DD");  
    }
    
    
  }

  
  get value():Date {
    return super.value;
  }

  constructor (protected vcr: ViewContainerRef) {
    super(vcr);
  }


  
  ngOnInit() {
    if (!this.disabled && this.startWithChar) {
      this._inputValue = this.startWithChar;
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.disabled) {
      if (this.startWithChar) {
        this.setFocus(false);
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus(true);
      }
    }


  }

  onContainerKeyDown(event:KeyboardEvent):boolean|void {
    var keyCode = event.keyCode;
      if (this.inputElement && this.inputElement.nativeElement == document.activeElement && [37, 39].indexOf(keyCode) !== -1) {
      return false;
    }
  }
  
  setFocus(select=false) { // select - for old browser without input[type=date]
    setTimeout(() => {
      if (!this.componentInit || this.disabled)
        return;

      this.inputElement.nativeElement.focus();
      if (select) {
        setTimeout(() => {
          this.inputElement.nativeElement.select();
        })
      }
      //input.setSelectionRange(0, (""+this.value).length ); // Конвертируем в строку, т.к. значение может быть и число и объект
    });
  }

  displayDate(date:Date):string {
    if (!date)
      return '';

    if (this.showTime) {
      return moment(date).format("DD.MM.YYYY HH:mm");
    }
    else {
      return moment(date).format("DD.MM.YYYY");
    }
    
  }

  isFocused():boolean {
    if (this.disabled)
      return false;

    if (this.inputElement && this.inputElement.nativeElement == document.activeElement)
      return true;

    return false;
  }
}



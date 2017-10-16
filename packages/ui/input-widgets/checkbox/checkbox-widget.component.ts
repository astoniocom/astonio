import {EventEmitter, Component,Injector, ViewChild, ViewChildren, ViewContainerRef, QueryList, ElementRef, HostListener, AfterViewInit, OnDestroy, Input,OnInit, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import Inputmask from 'inputmask';
import {Subscription} from 'rxjs';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CheckboxWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-checkbox',
  templateUrl: './checkbox-widget.html',
//  styleUrls: ['./checkbox-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxWidgetComponent extends BaseInputWidgetComponent implements AfterViewInit, OnInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  @ViewChild("inputElement") private inputElement: ElementRef;
  
  
  constructor (protected vcr: ViewContainerRef) {
    super(vcr);
  }

  _value:boolean;
  set value(val:boolean) {
    super.value = val;
  }

  get value():boolean {
    return super.value;
  }

  ngOnInit() {
  }
    
  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.disabled) {
      if (this.startWithChar) {
        this.setFocus();
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus();
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();

  }
  
  setFocus() {
    if (!this.componentInit || this.disabled)
      return;

    this.inputElement.nativeElement.focus();
  }

  onKeyDown($event:KeyboardEvent) {
    if ($event.keyCode === 46)
      this.value = null;
  }
}



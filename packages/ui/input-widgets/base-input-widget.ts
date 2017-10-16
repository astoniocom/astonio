import {EventEmitter,ElementRef, Input, Output, ChangeDetectorRef, Injector, ViewContainerRef} from '@angular/core';

const noop = () => {
};

export class BaseInputWidgetComponent  {
  // Взаимодействия с grid
  @Input() startWithKey:number; // KeyCode
  @Input() startWithChar:string;
  @Input() focusAfterInit:boolean;
  @Input() hostContainer:HTMLElement; // Html Element of cell
  @Input() data:Object;
  @Output() finished:EventEmitter<MouseEvent|KeyboardEvent> = new EventEmitter();
  onContainerKeyDown(event:KeyboardEvent):boolean|void {
  }

  @Input() emptyValue:any = null;

  _value: any;
  @Input() set value(val:any) {
    if (val === this._value || (typeof val === "number" && typeof this._value === "number" && isNaN(val) && isNaN(this._value)))
      return;

    this._value = val;
    if (this.onChangeCallback) {
      this.onChangeCallback(val);
    }
    this.cdr.markForCheck();
  }

  get value():any {
    return this._value;
  }
  
  _errors:string[] = [];
  @Input() set errors(value:string[]) {
    this._errors = value;
    if (this.cdr)
      this.cdr.markForCheck();
  };

  get errors():string[] {
    return this._errors;
  }

  @Input() input_id:string = '';
  
  _disabled:boolean;
  @Input() set disabled(val:boolean) {
    this._disabled = val;
    if (this.componentInit)
      this.cdr.markForCheck();
  }

  get disabled() {
    return this._disabled;
  }

  protected componentInit = false;
  protected onTouchedCallback: () => void = noop;
  protected onChangeCallback: (_: any) => void = noop;
  //protected elementRef: ElementRef;
  protected cdr:ChangeDetectorRef;
  protected injector:Injector;

  constructor (protected vcr:ViewContainerRef) {
    this.injector = vcr.injector;
    this.cdr = this.injector.get(ChangeDetectorRef);
  }

  ngAfterViewInit() {
    this.componentInit = true;
  }

  ngOnDestroy() {
    this.componentInit = false; // remove?
  }

  isValueSet():boolean {
    return this.value !== this.emptyValue;
  }

  //From ControlValueAccessor interface
  writeValue(val: string) {
    if (val !== this._value) {
      this.value = val;
    }
  }

  //From ControlValueAccessor interface
  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  //From ControlValueAccessor interface
  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }
}
import {Component, Input, AfterViewInit, ViewContainerRef, ViewChild, OnDestroy, ComponentFactoryResolver, 
  forwardRef, Injector, ComponentRef, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {RecordModel,  BaseField} from '@astonio/core';
import {LabelParams} from '@astonio/ui';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import {BaseInputWidgetComponent, TextInputWidgetComponent} from '@astonio/ui';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';

const noop = () => {
};

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ModelFormFieldGroupComponent),
    multi: true
};

var counter = 0;

export interface ModelFormFieldGroupParams {
  field?:BaseField|string;
  edit?:boolean;
  inputComponent?:typeof BaseInputWidgetComponent;
  inputParams?:any;
  labelParams?:LabelParams;
  class?:string;
  errors?:string[];
  model?:RecordModel;
}


@Component({
  selector: 'ast-model-form-field-group',
  templateUrl: './model-form-field-group.html',
//  styleUrls: ['./model-form-field-group.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelFormFieldGroupComponent implements OnInit, AfterViewInit, OnDestroy, ModelFormFieldGroupParams {
  @Input() field:BaseField|string;
  @Input() edit:boolean = true;
  @Input() inputComponent:typeof BaseInputWidgetComponent;
  @Input() inputParams:any = {};
  @Input() labelParams:LabelParams = {};

  @Input() class:string = '';

  _errors:string[] = [];
  @Input() set errors(value:string[]) {
    this._errors = value;
    /*if (this.componentInit)
      this.cdr.detectChanges();*/
    if (this.inputComponentRef)
      this.inputComponentRef.instance.errors = value;
  };

  get errors():string[] {
    return this._errors;
  }

  @Input() model:RecordModel;

  _value: any;
  //protected componentInit = false;
  protected inputComponentRef:ComponentRef<any>;

  private onTouchedCallback: () => void = noop;
  private onChangeCallback: (_: any) => void = noop;

  set value(val:any) {
    if (val !== this._value) {
      this._value = val;
      if (this.onChangeCallback) {
        this.onChangeCallback(val);
      }
      /*if (this.componentInit)
        this.cdr.detectChanges();*/
      if (this.inputComponentRef) {
        this.inputComponentRef.instance.value = val;
        //this.inputComponentRef.changeDetectorRef.detectChanges();
      }
    }
  }

  get value() {
    return this._value;
  }
  @ViewChild('input', {read: ViewContainerRef}) inputVcr: ViewContainerRef;
  id = '';
  
  constructor(protected componentFactoryResolver:ComponentFactoryResolver, protected injector:Injector, protected widgetsRegister:WidgetsRegister) {
  }

  ngOnInit() {
    if (this.field) {
      if (typeof this.field == "string")
        this.field = this.model.getField(this.field);
      var widget = this.widgetsRegister.getInputWidget(this.model, this.field, 'ast-model-form-field-group', {mode: this.edit?'edit':'view'});
      this.inputComponent = widget.component;
      this.inputParams = widget.componentParams;
    }
    else {
      this.inputComponent = TextInputWidgetComponent;
      this.inputParams = {disabled:!this.edit};
    }
  }

  ngAfterViewInit() {
    //this.componentInit = true;
    //this.prepareParams();
    this.id = '';
    if (this.field instanceof BaseField)
      this.id += this.field.name;
    this.id += '_'+counter++;

    let factory = this.componentFactoryResolver.resolveComponentFactory(this.inputComponent);
    this.inputComponentRef = this.inputVcr.createComponent<BaseInputWidgetComponent>(factory, this.inputVcr.length, this.injector);
    Object.assign(this.inputComponentRef.instance, this.inputParams);
    this.inputComponentRef.instance.errors = this.errors;
    this.inputComponentRef.instance.disabled = !this.edit;
    this.inputComponentRef.instance.value = this.value;
    this.inputComponentRef.instance.input_id = this.id;
    this.inputComponentRef.instance.registerOnChange(val => {
      this.value = val;
    });
    this.inputComponentRef.changeDetectorRef.detectChanges();
    
  }

  ngOnDestroy() {
    this.inputComponentRef.destroy();
  }

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

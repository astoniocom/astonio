import {Component, Input, ViewChildren, ViewChild, QueryList, AfterViewInit, ViewContainerRef, SimpleChanges, OnInit, ElementRef,
  Type, OnChanges, Injector, ComponentFactoryResolver, ReflectiveInjector, OnDestroy, ComponentRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import { Record, FieldChangedEvent, DataItem, BaseModel, BaseField, RecordModel} from '@astonio/core';
import {ModelFormFieldGroupComponent, ModelFormFieldGroupParams} from '../model-form-field-group/model-form-field-group.component';
import {Subscription} from 'rxjs';
import {BaseModelFormComponent} from '../base-model-form/base-model-form.component';
//import {ModelFormComponent, ModelFormFieldsDescriber} from '../model-form/model-form.component'; 
import {FrameService} from '@astonio/ui';
import {ModelFieldsProcessor, instanceOfModelFieldsProcessor} from '../../utils/model-fields';
import {BaseInputWidgetComponent} from '@astonio/ui';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';


export type ModelFormFieldsDescriber = (string|ModelFieldsProcessor|any[])[];

@Component({
  selector: 'ast-model-form',
  templateUrl: './model-form.html',
//  styleUrls: ['./model-form.css'],
  inputs: ['edit', 'model', 'record', 'fields', 'groupParams', 'labelParams', 'inputParams', 'inputComponent', 'layout', 'maxHorizontalSize'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelFormComponent extends BaseModelFormComponent implements OnInit, OnDestroy {
  @Input() fields: ModelFormFieldsDescriber;
  @Input() readonly: ModelFormFieldsDescriber;

  groupParams: {
    [fieldName:string]: ModelFormFieldGroupParams, // fieldName could be *
  } = {};

  labelParams: {
    [fieldName:string]: Object,
  } = {};

  inputParams: {
    [fieldName:string]: Object,
  } = {};

  inputComponent: {
    [fieldName:string]: typeof BaseInputWidgetComponent
  } = {};

  layout: string = 'vertical';

  maxHorizontalSize: number = 300;


  protected fieldsExpended: (string|Array<any>)[];
  protected readonlyExpended: (string|Array<any>)[];

  @ViewChildren('container', {read: ViewContainerRef}) containers: QueryList<any>;
  @ViewChild('area') areaElement: ElementRef;


 
  protected componentRefs:Map<string, ComponentRef<ModelFormFieldGroupComponent|ModelFormComponent>> = new Map();
  _containers = [];
  
  protected recordSubscriptions:Subscription[] = [];
  protected subscriptions:Subscription[] = [];
  fieldSize:number=0;
  
  constructor(protected vcr:ViewContainerRef, 
    protected injector:Injector, 
    protected componentFactoryResolver:ComponentFactoryResolver, 
    protected cdr:ChangeDetectorRef,
    protected frameService:FrameService,
    protected widgetsRegister:WidgetsRegister) {
    super();
  }

  ngOnInit() {
    if (this.model) {
      if (!this.fields) {
        this.fields = [];
        this.model.fields.forEach(field => {
          this.fields.push(field.name);
        });
      }

      this.fieldsExpended = this.expandFieldsList(this.model, this.fields, true);
      this.readonlyExpended = this.expandFieldsList(this.model, this.readonly || [], false);
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    
    this.subscriptions.push(this.frameService.changed.subscribe(event => {
      this.updateSizes();
    }));

    this.containers.changes.subscribe(() => {
      this.destroyForm();
      this.buildForm();
    });

    if (this.model) {
      this.rebuildForm();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.recordSubscriptions.forEach(s => s.unsubscribe());
  }

  rebuildForm() {
    this.destroyForm();
    if (this.model) {
      this._containers = new Array(this.fieldsExpended.length);
      this.updateSizes();
      this.cdr.detectChanges();
    }
  }

  onModelChanged() {
    if (this.componentInit) 
      this.rebuildForm();
  }

  buildForm() {
    if (!this.fieldsExpended)
      return;
    let childrenForms = 0;
    this.fieldsExpended.forEach((fieldName:string|string[], index) => {
      let containerVcr = (this.containers.toArray() as ViewContainerRef[])[index];
      if (typeof fieldName == "string") {
        let modelField = this.model.getField(fieldName);
        let factory = this.componentFactoryResolver.resolveComponentFactory(ModelFormFieldGroupComponent);
        let componentRef = containerVcr.createComponent<ModelFormFieldGroupComponent>(factory, containerVcr.length, this.injector);
        if (this.record) {
          componentRef.instance.value = this.record[fieldName];
          
          var fieldErrors = this.record.__director__.fieldMessages.get(fieldName) || [];
          var errors = [];
          for (let message of fieldErrors) {
            errors.push(message.message);
          }
          componentRef.instance.errors = errors;
        }

        componentRef.instance.edit = this.edit && this.readonlyExpended.indexOf(fieldName) == -1;
        componentRef.instance.field = modelField;
        componentRef.instance.model = this.model;
        componentRef.instance.registerOnChange(val => {
          if (this.record)
            this.record[(componentRef.instance.field as BaseField).name] = val;
        })

        var fieldGroupParams:ModelFormFieldGroupParams =  fieldName in this.groupParams ? this.groupParams[fieldName] : {};
        for (let key in (this.groupParams['*']) || {}) {
          if (!(key in fieldGroupParams))
            fieldGroupParams[key] =  this.groupParams['*'][key];
        }
        
        if (!('inputComponent' in fieldGroupParams)) {
          var inputWidget = this.getFieldInputComponent(modelField);
          fieldGroupParams.inputComponent = inputWidget.component;
          fieldGroupParams.inputParams = inputWidget.componentParams;
        }


        fieldGroupParams.inputParams =  fieldName in this.inputParams ? this.inputParams[fieldName] : {};
        for (let key in (this.inputParams['*'] || {})) {
          if (!(key in fieldGroupParams.inputParams))
            fieldGroupParams.inputParams[key] =  this.inputParams['*'][key];
        }
        
        fieldGroupParams.labelParams =  fieldName in this.labelParams ? this.inputParams[fieldName] : {};
        for (let key in (this.labelParams['*']) || {}) {
          if (!(key in fieldGroupParams.labelParams))
            fieldGroupParams.labelParams[key] =  this.labelParams['*'][key];
        }


        componentRef.instance.errors = errors;
        Object.assign(componentRef.instance, fieldGroupParams);
        this.componentRefs.set(modelField.name, componentRef);
      }
      else if (fieldName instanceof Array) {
        let factory = this.componentFactoryResolver.resolveComponentFactory(ModelFormComponent);
        let componentRef = containerVcr.createComponent<ModelFormComponent>(factory, containerVcr.length, this.injector);
        componentRef.instance.record = this.record;
        componentRef.instance.model = this.model; 
        componentRef.instance.edit = this.edit;
        componentRef.instance.fields = fieldName;
        componentRef.instance.readonly = this.readonly;
        componentRef.instance.layout = this.layout == 'horizontal'?'vertical':'horizontal';
        componentRef.instance.groupParams = this.groupParams;
        componentRef.instance.labelParams = this.labelParams;
        componentRef.instance.inputParams = this.inputParams;
        componentRef.instance.inputComponent = this.inputComponent;
            
        this.componentRefs.set(`form_${childrenForms++}`, componentRef);
      }
    })
    this.cdr.detectChanges();
  }

  getFieldInputComponent(field:BaseField):{component: typeof BaseInputWidgetComponent, componentParams?:Object} {
    if (field.name in this.inputComponent) {
      return {component: this.inputComponent[field.name], componentParams:{}};
    }
    return this.widgetsRegister.getInputWidget(this.model, field, 'ast-model-form', {mode: this.edit ? 'edit': 'view'});
  }

  recordChanged() {
    this.recordSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.recordSubscriptions = [];

    if (this.record) {
      // Устанавливаем каждое поле в новое значние.
      this.componentRefs.forEach(componentRef => {
        if (componentRef.instance instanceof ModelFormFieldGroupComponent)
          componentRef.instance.value = this.record[(componentRef.instance.field as BaseField).name];
        if (componentRef.instance instanceof ModelFormComponent)
          componentRef.instance.record = this.record;
        //componentRef.changeDetectorRef.detectChanges();
      });

      var s = this.record.__director__.changed.filter(ev => {
        return ev instanceof FieldChangedEvent;
      }).subscribe((ev:FieldChangedEvent) => {
        // Устанавливаем изминившееся поле в новое значение
        var componentRef = this.componentRefs.get(ev.fieldName) as ComponentRef<ModelFormFieldGroupComponent>;
        if (!componentRef) 
          return; // Поле скрыто
        componentRef.instance.value = ev.newValue;
        componentRef.changeDetectorRef.detectChanges();
      });

      /*var s1 = this.record.__director__.saved.subscribe(ev => { 
        this.recordChanged();
      })*/
      var s2 = this.record.__director__.loaded.subscribe(ev => { 
        this.recordChanged();
      })
      this.recordSubscriptions.push(s, /*s1,*/ s2);

      this.record.__director__.messagesChanged.subscribe(() => {
        for (let field of this.record.__director__.model.fields) {
          var componentRef = this.componentRefs.get(field.name) as ComponentRef<ModelFormFieldGroupComponent>;
          if (!componentRef) 
            continue; // Поле скрыто
          var errors = [];

          if (this.record.__director__.fieldMessages.has(field.name)) {
            let messages = this.record.__director__.fieldMessages.get(field.name);
            
            for (let message of messages) {
              errors.push(message.message);
            }
          }

          componentRef.instance.errors = errors;
        }
      });
    }
    else {
      this.componentRefs.forEach(componentRef => {
        if (componentRef.instance instanceof ModelFormFieldGroupComponent)
          componentRef.instance.value = null; // empty value
      });
    }
    
  }

  updateSizes() {
    var containerWidth = this.areaElement.nativeElement.clientWidth;
    if (containerWidth < this.maxHorizontalSize) {
      this.fieldSize = 100;
    }
    else {
      this.fieldSize = 100 / this._containers.length;
    }
    this.cdr.detectChanges();
  }

  expandFieldsList(model: BaseModel, fields: ModelFormFieldsDescriber, allowDuplicates?:boolean, used?:string[]):(string[]|string)[] {
    var result:(string[]|string)[] = [];

    if (!used)
      used = [];
    if (allowDuplicates === undefined)
      allowDuplicates = false;
    
    fields.forEach(nextFieldDesc => {
      if (typeof nextFieldDesc === "string" ) {
        if (nextFieldDesc == "*") {
          for (let field of model.fields) {
            if (used.indexOf(field.name) == -1 || allowDuplicates==true) {
              result.push(field.name);
              used.push(field.name);
            }
          }
        }
        else {
          if (model.hasField(nextFieldDesc) && (used.indexOf(nextFieldDesc) == -1 || allowDuplicates==true)) {
            result.push(nextFieldDesc);
            used.push(nextFieldDesc);
          }
        }
        /*else if (nextFieldDesc == '__repr__') {
          result.push({component: RecordRepr});
        }*/
      }
      else if (instanceOfModelFieldsProcessor(nextFieldDesc)) {
        for (let field of model.fields) {
          if (nextFieldDesc.include && nextFieldDesc.include.indexOf(field.name) == -1)
            continue
          if (nextFieldDesc.exclude && nextFieldDesc.exclude.indexOf(field.name) !== -1)
            continue
          
          if (used.indexOf(field.name) == -1 || allowDuplicates==true) {
            result.push(field.name);
            used.push(field.name);
          } 
        }
          
        return result; 
      }
      else if (nextFieldDesc instanceof Array) {
        result.push(this.expandFieldsList(model, nextFieldDesc, allowDuplicates, used) as string[]);
      }
      /*else if (typeof nextFieldDesc === "object" && ('component' in <ExtraFieldDescriber>nextFieldDesc)) {
        result.push(nextFieldDesc);
      }*/
    });
    
    return result;
  }
}

import {Component, ChangeDetectorRef, ViewContainerRef, ComponentFactoryResolver, Injector, OnInit, ComponentRef, Input,
  EventEmitter, Output} from '@angular/core';
import {ListModel, BaseField} from '@astonio/core';
import {BaseInputWidgetComponent, TextInputWidgetComponent} from '@astonio/ui';
import {Lookup} from '@astonio/core';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';

@Component({
  selector: 'ast-query-where-from-condition-container',
  template: ' ',
})
export class QueryWhereFormConditionContainerComponent implements OnInit {
  @Input() lookup:Lookup;
  @Input() field:BaseField;
  @Input() model:ListModel;
  @Output() changed = new EventEmitter<void>();
  inputComponentRef:ComponentRef<BaseInputWidgetComponent>;

  constructor(protected cdr:ChangeDetectorRef, protected vcr:ViewContainerRef, protected componentFactoryResolver:ComponentFactoryResolver,
    protected injector:Injector, protected widgetsRegister:WidgetsRegister){
  }

  ngOnInit() {
    try {
      var componentInfo = this.widgetsRegister.getInputWidget(this.model, this.field, 'ast-query-where-from', {lookup: (this.lookup as any).constructor});
    }
    catch (e) {
      this.vcr.element.nativeElement.innerHTML = 'Not supported';
      return;
    }
    let factory = this.componentFactoryResolver.resolveComponentFactory(componentInfo.component);
    this.inputComponentRef = this.vcr.createComponent<BaseInputWidgetComponent>(factory, this.vcr.length, this.injector);
    if (componentInfo.componentParams)
      Object.assign(this.inputComponentRef.instance, componentInfo.componentParams)
    //this.newConditionInputComponentRef.instance.errors = this.errors;
    this.inputComponentRef.instance.value = this.lookup.rhs;
    //this.newConditionInputComponentRef.instance.input_id = this.id;
    this.inputComponentRef.instance.registerOnChange(val => {
      this.lookup.rhs = val;
      this.changed.next();
    });

  }
}
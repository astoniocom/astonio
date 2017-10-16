import {Injectable} from '@angular/core';
import {ListModel, Lookup, BaseModel, BaseField, BaseDbField, ForeignKeyVirtualField,
  CharField, NumberField, NumberRangeField, DateRangeField, BooleanField, DateField, DateTimeField, RelatedRecordsVirtualField,
  Exact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Range, 
  IExact, Contains, IContains, StartsWith, IStartsWith, EndsWith, IEndsWith} from '@astonio/core';
import {BaseInputWidgetComponent, TextInputWidgetComponent, NumberRangeInputWidgetComponent, DateRangeInputWidgetComponent, 
  NumberInputWidgetComponent, DateInputWidgetComponent, CheckboxWidgetComponent, ChoiseWidgetComponent} from '@astonio/ui';
import {RecordChoiseWidgetComponent} from '../../input-widgets/record-choise/record-choise-widget.component';
import {RelatedRecordsWidgetComponent} from '../../input-widgets/related-records/related-records-widget.component';

export class WidgetsRegister {
  getInputWidget(model:BaseModel, field:BaseField, target:string, params:Object):{component: typeof BaseInputWidgetComponent, componentParams?:Object } {
    if ([undefined, 'ast-record-list-grid', 'ast-model-form', 'ast-related-records-grid', 'ast-model-form-field-group', 'ast-queryset-grid'].indexOf(target) !== -1) {
      var inputTargetParams = params as {mode:string};
      var disabled = inputTargetParams.mode=='view';

      if (field instanceof BaseDbField && field.choices && field.choices.length)
        return {component: ChoiseWidgetComponent, componentParams: {disabled: disabled, choices:field.choices, emptyValue: field.getEmptyValue()}};
      else if (field instanceof NumberField)
        return {component: NumberInputWidgetComponent, componentParams: {disabled: disabled}};
      else if (field instanceof NumberRangeField)
        return {component: NumberRangeInputWidgetComponent, componentParams: {disabled: disabled}};
      else if (field instanceof DateRangeField)
        return {component: DateRangeInputWidgetComponent, componentParams: {disabled: disabled}};
      else if (field instanceof BooleanField)
        return {component: CheckboxWidgetComponent, componentParams: {disabled: disabled}};
      else if (field instanceof DateField)
        return {component: DateInputWidgetComponent, componentParams: {disabled: disabled, showTime: false}};
      else if (field instanceof DateTimeField)
        return {component: DateInputWidgetComponent, componentParams: {disabled: disabled, showTime: true}};
      else if (field instanceof ForeignKeyVirtualField)
        return {component: RecordChoiseWidgetComponent, componentParams: {disabled: disabled, models: [(field as ForeignKeyVirtualField).model], list: (field as ForeignKeyVirtualField).model}};
      else if (field instanceof RelatedRecordsVirtualField)
        return {component: RelatedRecordsWidgetComponent, componentParams: {disabled: disabled/*, models: [(field as ForeignKeyVirtualField).model], list: (field as ForeignKeyVirtualField).model*/}};
      else {
        let componentParams = {disabled: disabled};
        if (field instanceof BaseDbField && field.maxLength) 
          componentParams['maxLength'] = field.maxLength;
        return {component: TextInputWidgetComponent, componentParams: componentParams};
      }
    }
    else if (target == 'ast-query-where-from') {
      var filterTargetParams = params as {lookup:typeof Lookup};
      if (field instanceof BaseDbField && field.choices && field.choices.length && filterTargetParams.lookup == Exact)
        return {component: ChoiseWidgetComponent, componentParams: {disabled: disabled, choices:field.choices, emptyValue: field.getEmptyValue()}};
      else if (field instanceof CharField) {
        if ([Exact, IExact, Contains, IContains, StartsWith, IStartsWith, EndsWith, IEndsWith].indexOf(filterTargetParams.lookup) !== -1 ) {// In 
          let componentParams = {};
          if (field instanceof BaseDbField && field.maxLength) 
            componentParams['maxLength'] = field.maxLength;
          return {component: TextInputWidgetComponent, componentParams:componentParams};
        }
      }
      else if (field instanceof NumberField) {
        if ([Exact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual].indexOf(filterTargetParams.lookup) !== -1 )// In
          return {component: NumberInputWidgetComponent};
        else if (filterTargetParams.lookup == Range) {
          return {component: NumberRangeInputWidgetComponent};
        }
      }
      else if (field instanceof BooleanField) {
        if (filterTargetParams.lookup == Exact) {
          return {component: CheckboxWidgetComponent};
        }
      }
      else if (field instanceof DateField) {
        if ([Exact].indexOf(filterTargetParams.lookup) !== -1 ) // In
          return {component: DateInputWidgetComponent, componentParams: {showTime: false}};
        else if (filterTargetParams.lookup == Range) {
          return {component: DateRangeInputWidgetComponent, componentParams: {showTime: false}};
        }
      }
      else if (field instanceof DateTimeField) { 
        if ([Exact].indexOf(filterTargetParams.lookup) !== -1 )// In
          return {component: DateInputWidgetComponent, componentParams: {showTime: true}};
        else if (filterTargetParams.lookup == Range) {
          return {component: DateRangeInputWidgetComponent, componentParams: {showTime: true}};
        }
      }
    }
    
    throw new Error(`Can't find input component. Model '${model.name}', field '${field.name}', target '${target}'.` );
  }
}
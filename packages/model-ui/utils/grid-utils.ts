import {BaseModel, RecordModel} from '@astonio/core';
import {GridColumn, instanceOfGridColumn} from '@astonio/ui';
import {ModelFieldsProcessor, instanceOfModelFieldsProcessor} from './model-fields';
import {WidgetsRegister} from '../services/widgets-register/widgets-register.service';

export type ModelGridFieldDescriber = string|ModelFieldsProcessor|GridColumn;

export function expandFieldList(model: BaseModel, fields: ModelGridFieldDescriber[], allowDuplicates?:boolean):(string|GridColumn)[] {
  var expandedFields:(string|GridColumn)[] = [];
  var used = [];

  if (allowDuplicates === undefined)
    allowDuplicates = false;
  
  fields.forEach(nextFieldDesc => {
    if (typeof nextFieldDesc === "string" ) {
      if (nextFieldDesc == "*") {
        for (let field of model.fields) {
          if (used.indexOf(field.name) == -1 || allowDuplicates==true) {
            expandedFields.push(field.name);
            used.push(field.name);
          }
        }
      }
      else if (nextFieldDesc == '__repr__') {
        expandedFields.push(nextFieldDesc);
      }
      else {
        if (model.hasField(nextFieldDesc) && (used.indexOf(nextFieldDesc) == -1 || allowDuplicates==true)) {
          expandedFields.push(nextFieldDesc);
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
          expandedFields.push(field.name);
          used.push(field.name);
        } 
      }
    }
    else if (instanceOfGridColumn(nextFieldDesc)) {
      expandedFields.push(nextFieldDesc);
    }
  });
  return expandedFields;
}

export function constructFieldsList(target:string, widgetsRegister:WidgetsRegister, readonlyFields: (string|GridColumn)[], model: BaseModel, fields: ModelGridFieldDescriber[], allowDuplicates?:boolean):GridColumn[] {
  var result:GridColumn[] = [];
  for (let field of expandFieldList(model, fields, allowDuplicates)) {
    if (typeof field == "string") {
      if (field == '__repr__') {
        result.push({
          id: field,
          headerName: ' ',
          valueGetter: (row) => {
            return row ? ''+row : '';
          },
        });
      }
      else {
        var modelField = model.getField(field);
        var editWidget = widgetsRegister.getInputWidget(model as RecordModel, modelField, target, {mode: 'edit'});
        var viewWidget = widgetsRegister.getInputWidget(model as RecordModel, modelField, target, {mode: 'view'});
        var colConfig:GridColumn = {
          sorting: true,
          field: field,
          headerName: modelField.verboseName,
          viewComponent: viewWidget.component, viewComponentParams: viewWidget.componentParams, 
        };
        if (!readonlyFields || readonlyFields.length == 0 || readonlyFields.indexOf(field) == -1) {
          colConfig['editComponent'] = editWidget.component;
          colConfig['editComponentParams'] = editWidget.componentParams;
        }
        result.push(colConfig);
      }
    }
    else if (instanceOfGridColumn(field)) {
      result.push(field);
    }
  }
  return result;
}
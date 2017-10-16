import { NgModule, ModuleWithProviders } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AstonioUIModule } from '../ui/module';
import { FrameService, BrowserFrameService} from '../ui';
import {ModelFormComponent} from './controls/model-form/model-form.component';
import {RecordListGridComponent} from './controls/record-list-grid/record-list-grid.component';
import {RelatedRecordsGridComponent} from './controls/related-records-grid/related-records-grid.component';
import {QuerysetGridComponent} from './controls/queryset-grid/queryset-grid.component';
import {DataItemListGridComponent} from './controls/data-item-list-grid/data-item-list-grid.component';
import {ModelFormFieldGroupComponent} from './controls/model-form-field-group/model-form-field-group.component';
import {QueryWhereFormComponent} from './controls/query-where-form/query-where-form.component';
import {QueryWhereFormConditionContainerComponent} from './controls/query-where-form/query-where-form-condition-container.component';
import {AgGridModule} from 'ag-grid-angular/main';
import {CommonListWindowComponent} from './windows/common-list-window/common-list-window.component';
import {CommonRecordWindowComponent} from './windows/common-record-window/common-record-window.component';
import {RelatedRecordsWindowComponent} from './windows/related-records-window/related-records-window.component';
import {FilterWindowComponent} from './windows/filter-window/filter-window.component';
import {ModelWindowsDispatcher} from './services/model-windows-dispatcher/model-windows-dispatcher';
import {RelatedRecordsGridToolbarComponent} from './controls/related-records-grid-toolbar/related-records-grid-toolbar.component';
import {QuerysetGridToolbarComponent} from './controls/queryset-grid-toolbar/queryset-grid-toolbar.component';
import {WidgetsRegister} from './services/widgets-register/widgets-register.service';
import {RecordChoiseWidgetComponent} from './input-widgets/record-choise/record-choise-widget.component';
import {RelatedRecordsWidgetComponent} from './input-widgets/related-records/related-records-widget.component';
import {AstonioModelUIModuleConfig, AstonioModelUIConfigService} from './services/config/config.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FlexLayoutModule,
    AstonioUIModule,
    AgGridModule.withComponents([]),
  ],
  declarations: [
    ModelFormComponent,
    DataItemListGridComponent,
    RecordListGridComponent,
    RelatedRecordsGridComponent,
    QuerysetGridComponent,
    ModelFormFieldGroupComponent,
    CommonListWindowComponent,
    CommonRecordWindowComponent,
    RelatedRecordsWindowComponent,
    FilterWindowComponent,
    RelatedRecordsGridToolbarComponent,
    QuerysetGridToolbarComponent,
    QueryWhereFormComponent,
    QueryWhereFormConditionContainerComponent,
    RecordChoiseWidgetComponent,
    RelatedRecordsWidgetComponent
  ],
  providers: [
    {provide: FrameService, useClass: BrowserFrameService},
    ModelWindowsDispatcher,
    WidgetsRegister,
  ],
  entryComponents: [
    ModelFormFieldGroupComponent,
    ModelFormComponent,
    CommonListWindowComponent,
    CommonRecordWindowComponent,
    RelatedRecordsWindowComponent,
    FilterWindowComponent,
    QueryWhereFormComponent,
    RecordChoiseWidgetComponent,
    RelatedRecordsWidgetComponent,
  ],
  exports: [
    ModelFormComponent,
    RecordListGridComponent,
    RelatedRecordsGridComponent,
    QuerysetGridComponent,
    ModelFormFieldGroupComponent,
    DataItemListGridComponent,
    RelatedRecordsGridToolbarComponent,
    QuerysetGridToolbarComponent,
    RecordChoiseWidgetComponent,
    RelatedRecordsWidgetComponent
  ]
})
export class AstonioModelUIModule { 
  static forRoot(config: AstonioModelUIModuleConfig={}): ModuleWithProviders {
    return {
      ngModule: AstonioModelUIModule,
      providers: [AstonioModelUIConfigService, {provide: 'ast-model-ui-config', useValue: config}]
    };
  }
}

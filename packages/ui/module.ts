import { NgModule, ModuleWithProviders } from '@angular/core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogService, QuestionDialogComponent, ChoiceDialogComponent } from './dialogs/dialog.service';
import { ToolbarComponent} from './controls/toolbar/toolbar.component';
import { ButtonComponent} from './controls/button/button.component';
import { GridComponent} from './controls/grid/grid.component';
import { GridEditInputCellComponent } from './controls/grid/grid-edit-input-cell.component';
import { GridViewInputCellComponent } from './controls/grid/grid-view-input-cell.component';
import { GridEditRenderCellComponent } from './controls/grid/grid-edit-render-cell.component';
import { GridViewRenderCellComponent } from './controls/grid/grid-view-render-cell.component';
import { GridStatusRendererCellComponent } from './controls/grid/grid-status-renderer-cell.component';
import { DropdownButtonComponent} from './controls/dropdown-button/dropdown-button.component';
import { ButtonGroupComponent} from './controls/button-group/button-group.component';
import { FormFieldGroupComponent} from './controls/form-field-group/form-field-group.component';
import { PopupMenuComponent} from './controls/popup-menu/popup-menu.component';
import { MenuComponent} from './controls/menu/menu.component';
import { MenuItemComponent} from './controls/menu-item/menu-item.component';
import { PopupMenuItemComponent} from './controls/popup-menu-item/popup-menu-item.component';
import { LabelComponent} from './controls/label/label.component';
import { TabsComponent} from './controls/tabs/tabs.component';
import { TabComponent} from './controls/tab/tab.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import {OverlayModule} from '@angular/cdk/overlay';
import {AgGridModule} from 'ag-grid-angular/main';
import {InputFrameComponent} from './input-widgets/input-frame/input-frame.component';
import {InputFrameButtonComponent} from './input-widgets/input-frame/input-frame-button.component';
import {TextInputWidgetComponent} from './input-widgets/text-input/text-input-widget.component';
import {NumberInputWidgetComponent} from './input-widgets/number-input/number-input-widget.component';
import {DateInputWidgetComponent} from './input-widgets/date-input/date-input-widget.component';
import {ChoiseWidgetComponent} from './input-widgets/choise/choise-widget.component';
import {ModalContentDirective, AutofocusDirective} from './utils';
import {ItemsListComponent} from './controls/items-list/items-list.component' ;
import {ItemsGroupComponent} from './controls/items-group/items-group.component' ;
import {CheckboxWidgetComponent} from './input-widgets/checkbox/checkbox-widget.component';
import {NumberRangeInputWidgetComponent} from './input-widgets/number-range-input/number-range-input-widget.component';
import {DateRangeInputWidgetComponent} from './input-widgets/date-range-input/date-range-input-widget.component';
import {AstonioUIConfigService, AstonioUIModuleConfig} from './services/config.service';
import {AboutWindowComponent} from './windows/about/about-window.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FlexLayoutModule,
    OverlayModule,
    NoopAnimationsModule,
    AgGridModule.withComponents([]),
  ],
  declarations: [
    ToolbarComponent,
    ButtonComponent,
    DropdownButtonComponent,
    FormFieldGroupComponent,
    ButtonGroupComponent,
    QuestionDialogComponent,
    ChoiceDialogComponent,
    PopupMenuComponent,
    MenuComponent,
    MenuItemComponent,
    PopupMenuItemComponent,
    LabelComponent,
    GridComponent,
    GridEditInputCellComponent,
    GridViewInputCellComponent,
    GridEditRenderCellComponent,
    GridViewRenderCellComponent,
    GridStatusRendererCellComponent,
    TabsComponent,
    TabComponent,
    InputFrameComponent,
    InputFrameButtonComponent,
    ModalContentDirective,
    AutofocusDirective,
    TextInputWidgetComponent,
    NumberInputWidgetComponent,
    DateInputWidgetComponent,
    ChoiseWidgetComponent,
    ItemsListComponent,
    ItemsGroupComponent,
    CheckboxWidgetComponent,
    NumberRangeInputWidgetComponent,
    DateRangeInputWidgetComponent,
    AboutWindowComponent,
    //DropdownComponent,
  ],
  providers: [
    DialogService,
  ],
  entryComponents: [
    QuestionDialogComponent, ChoiceDialogComponent, GridEditInputCellComponent, GridViewInputCellComponent,
    GridEditRenderCellComponent, GridViewRenderCellComponent, GridStatusRendererCellComponent,
    TextInputWidgetComponent,
    NumberInputWidgetComponent,
    DateInputWidgetComponent,
    ChoiseWidgetComponent,
    ItemsListComponent,
    ItemsGroupComponent,
    CheckboxWidgetComponent,
    NumberRangeInputWidgetComponent,
    DateRangeInputWidgetComponent,
    FormFieldGroupComponent,
    AboutWindowComponent,
    //DropdownComponent,
  ],
  exports: [
    ToolbarComponent, ButtonComponent, ButtonGroupComponent, DropdownButtonComponent, FormFieldGroupComponent, QuestionDialogComponent, ChoiceDialogComponent,
    MenuComponent, PopupMenuComponent, MenuItemComponent, PopupMenuItemComponent, LabelComponent, GridComponent,GridEditInputCellComponent, GridViewInputCellComponent,
    GridEditRenderCellComponent, GridViewRenderCellComponent, TabsComponent, TabComponent,
    InputFrameComponent,
    InputFrameButtonComponent,
    ModalContentDirective,
    AutofocusDirective,
    TextInputWidgetComponent,
    NumberInputWidgetComponent,
    DateInputWidgetComponent,
    ChoiseWidgetComponent,
    ItemsListComponent,
    ItemsGroupComponent,
    CheckboxWidgetComponent,
    NumberRangeInputWidgetComponent,
    DateRangeInputWidgetComponent,
    AboutWindowComponent,
    //DropdownComponent,
  ]
})
export class AstonioUIModule { 
  static forRoot(config: AstonioUIModuleConfig={}): ModuleWithProviders {
    return {
      ngModule: AstonioUIModule,
      providers: [AstonioUIConfigService, {provide: 'ast-ui-config', useValue: config}]
    };
  }
}

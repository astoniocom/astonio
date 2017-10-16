import {Component, ChangeDetectionStrategy} from "@angular/core";
import {ICellRendererParams} from "ag-grid/main";
import {ICellRendererAngularComp} from "ag-grid-angular";
import {GridComponent} from './grid.component';

@Component({
  selector: 'ast-grid-status-renderer-cell',
  templateUrl: './grid-status-renderer-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridStatusRendererCellComponent implements ICellRendererAngularComp {
  grid:GridComponent;
  params:ICellRendererParams;
  hasErrors = false;
  modified = false;
  errors:string[];
  errorsStr:string = '';
  
  agInit(params:ICellRendererParams) {
    this.params = params;
    var rendereParams = params.column.getColDef().cellRendererParams;
    this.grid = rendereParams.grid;

    this.errors = this.grid.rowErrors.get(this.params.data);
    var fieldErrors = this.grid.fieldErrors.get(this.params.data);

    this.hasErrors = !!((this.errors && this.errors.length) || (fieldErrors && Object.keys(fieldErrors).length));

    if (this.hasErrors) {
      params.eGridCell.parentElement.classList.add("ast-grid-error-row");
    }
    else {
      params.eGridCell.parentElement.classList.remove("ast-grid-error-row");
    }

    if (this.errors) {
      this.errors.forEach(error => {
        this.errorsStr += error + '\n';
      })
    }

    this.modified = this.grid.changedRows.indexOf(this.params.data) !== -1;
    //console.log(params);
    //console.log(this.component); 
  }
}
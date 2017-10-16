import {Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, Injector} from '@angular/core';
import {QuerysetGridComponent} from '../queryset-grid/queryset-grid.component';
import {QuerysetGridActions} from '../../actions/queryset-grid-actions';
import {WindowsManager, Window, BaseDataStorageService} from '@astonio/ui';
import {Where, Exact, Q, Lookup} from "@astonio/core";
import {FilterWindow} from '../../windows/filter-window/filter-window';
import {Subscription} from 'rxjs';

@Component({
  selector: 'ast-queryset-grid-toolbar',
  templateUrl: './queryset-grid-toolbar.html'
})
export class QuerysetGridToolbarComponent implements OnDestroy, AfterViewInit, OnInit {
  @Input() grid:QuerysetGridComponent;
  filterWnd:FilterWindow<any, any>;
  actions: QuerysetGridActions;
  dropdownFilter =  true;
  dropdownFilterOn = false;
  initWhere:Where;

  protected filterChangedSubscription:Subscription;
  protected filterWndClosedSubscription:Subscription;
  protected filterStickSubscription:Subscription;

  constructor(protected injector:Injector, protected wm:WindowsManager, 
    protected parentWnd:Window<any,any>, protected cdr:ChangeDetectorRef, protected ds:BaseDataStorageService) { 
  }

  ngOnInit() {
    this.actions = new QuerysetGridActions(this.grid, this.injector);
    
  }

  ngAfterViewInit() {
    this.initWhere = this.grid.queryset.query.where.clone();
  }


  ngOnDestroy() {
    this.actions.destroy();

    if (this.filterChangedSubscription) 
      this.filterChangedSubscription.unsubscribe();

    if (this.filterWndClosedSubscription)
      this.filterWndClosedSubscription.unsubscribe();

    if (this.filterStickSubscription)
      this.filterStickSubscription.unsubscribe();
  }

  openFilterWindow() {
    this.filterWnd = new FilterWindow(this.wm, this.parentWnd, {componentParams: {query: this.grid.queryset.query, initWhere:this.grid.queryset.query.where, showStickButton: true}});
    this.filterWnd.componentRef.changeDetectorRef.detectChanges();

    this.filterChangedSubscription = this.filterWnd.componentRef.instance.whereChanged.subscribe((newWhere) => {
      this.grid.queryset.query.where = newWhere;
      
      //this.updateGridQueryset();
      this.grid.refreshView();
      this.cdr.detectChanges(); // чтобы кнопка стала жирной
    });

    this.filterStickSubscription = this.filterWnd.componentRef.instance.stick.subscribe(() => {
      this.filterWnd.close().subscribe(() => {
        this.showDropdownFilter();
        this.ds.set('queryset-grid-toolbar-filter-window-mode', false);
        this.cdr.detectChanges();
      });
    });

    this.filterWndClosedSubscription = this.filterWnd.closed.subscribe(() => {
      if (this.filterChangedSubscription) 
        this.filterChangedSubscription.unsubscribe();
      this.filterChangedSubscription = null;

      if (this.filterWndClosedSubscription)
        this.filterWndClosedSubscription.unsubscribe();
      this.filterWndClosedSubscription = null;

      if (this.filterStickSubscription)
        this.filterStickSubscription.unsubscribe();
      this.filterStickSubscription = null;
    });
  }

  quickFilter() {
    if (!this.quickFilterAvailable())
      return;

    var focusedCell = this.grid.getFocusedCell();
    if (typeof focusedCell.col == "string")
      return;

    if (!this.grid.queryset.query.where['__qf__']) { // To now if Filter button should be bolded
      this.grid.queryset.query.where['__qf__'] = this.grid.queryset.query.where.clone();
    }

    var pos = 0;
    var found = false;
    for (let condition of this.grid.queryset.query.where.children) {
      if (condition instanceof Exact && condition.name == focusedCell.col.field && condition.rhs == focusedCell.rowData[focusedCell.col.field]) {
        found = true;
        break;         
      }
      pos++;
    }

    if (found) {
      this.grid.queryset.query.where.children.splice(pos, 1);
    }
    else {
      var cond = {}
      cond[focusedCell.col.field] = focusedCell.rowData[focusedCell.col.field];
      this.grid.queryset.query.add_q(new Q(cond));
    }

    //this.updateGridQueryset();
    this.grid.refreshView();
    this.cdr.detectChanges(); // чтобы кнопка стала жирной
    if (this.filterWnd && !this.filterWnd.isClosed) {
      this.filterWnd.componentRef.changeDetectorRef.detectChanges();
    }
  }

  quickFilterAvailable():boolean {
    if (!this.grid.isReady)
      return false;

    var focusedCell = this.grid.getFocusedCell();
    if (!focusedCell || !focusedCell.rowData || typeof focusedCell.col == "string" || focusedCell.col.id == '__repr__')
      return false;
    return true;
  }

  hasFilter():boolean {
    if (!this.initWhere)
      return false;
    if (this.initWhere.children.length !== this.grid.queryset.query.where.children.length)
      return true;
    if (this.initWhere.connector !== this.grid.queryset.query.where.connector)
      return true;
    if (this.initWhere.negated !== this.grid.queryset.query.where.negated)
      return true;
    
    for (let pos of [...Array(this.initWhere.children.length).keys()]) {
      if (this.initWhere.children[pos] instanceof Where)
        return true;
      if (! (this.initWhere.children[pos] instanceof this.grid.queryset.query.where.children[pos].constructor))
        return true;
      if ((this.initWhere.children[pos] as Lookup).lhs !== (this.grid.queryset.query.where.children[pos] as Lookup).lhs)
        return true;
      if ((this.initWhere.children[pos] as Lookup).rhs !== (this.grid.queryset.query.where.children[pos] as Lookup).rhs)
        return true;
    }


    return false;
  }

  cancelFilter() {
    if (!this.cancelFilterAvailable())
      return;

    this.grid.queryset.query.where = this.initWhere.clone();
    this.grid.refreshView();
    this.cdr.detectChanges(); // Чтобы кнопка перестала быть жирной
  }

  cancelFilterAvailable():boolean {
    return this.hasFilter();
  }

  onFilterClicked() {
    if (this.ds.get('queryset-grid-toolbar-filter-window-mode', true) && !this.dropdownFilterOn) {
      this.openFilterWindow();
    }
    else {
      if (!this.dropdownFilterOn) {
        this.showDropdownFilter();
      }
      else {
        this.dropdownFilterOn = false;
      }
    }
  }

  showDropdownFilter () {
    this.dropdownFilterOn = true;
  }

  applyNewWhere() {
    this.grid.refreshView();
  }

  onUnstickClicked() {
    this.dropdownFilterOn = false;
    this.ds.set('queryset-grid-toolbar-filter-window-mode', true);
    this.openFilterWindow();
  }

}
import {ViewChild, Component, ElementRef, Output, EventEmitter, AfterViewInit, 
        HostListener, OnDestroy, Input, ContentChild, TemplateRef, ApplicationRef, Type, ViewEncapsulation} from '@angular/core';
import {ItemsGroupComponent, GroupFocusEvent} from '../items-group/items-group.component';

@Component({
  selector: 'ast-items-list',
  templateUrl: 'items-list.html',
  //styleUrls: ['items-list.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ItemsListComponent {
  @Output() picked: EventEmitter<any> = new EventEmitter<any>();

  protected _items:any[];
  @Input('items') set items(value:any[]) {
    if (this._items === value )
      return;
    this._items = value;
  };

  get items():any[] {
    return this._items;
  }
  @Input('childrenAttr') childrenAttr:string;
  @Input('expandedAttr') expandedAttr:string;  
  @Input('ifProcessKeys') ifProcessKeys:boolean = false;
  @Input('allExpanded') allExpanded:boolean = false;
  @Input('selectType')selectType:string = ['item', 'item_with_parents', 'item_no_parents'][0]; 
  @Input('selectMode')selectMode:string = ['single', 'multiple'][0]; // multiple // тут еще можно было бы подумать по поводу разрешение снятия выделения в single mode
  @Output('focusChanged') focusChanged:EventEmitter<GroupFocusEvent> = new EventEmitter<GroupFocusEvent>(); // Применяется только для root-группы
  @Output('selectionChanged') selectionChanged:EventEmitter<any[]> = new EventEmitter<any[]>(); // Применяется только в root-группе. Произошли изменения в какой либо группе, ниже по иерархии
  @ViewChild('group') group: ItemsGroupComponent;
  @ContentChild(TemplateRef) itemTemplate:TemplateRef<any>;

  currentFocus:number[] = [];

  constructor() {
  }

  @HostListener('document:keydown', ['$event']) 
  onKeyDown($event) {
    if (this.ifProcessKeys && this.items && this.items.length) {
      if ($event.key=="ArrowDown") {
        this.group.downKey();
        $event.preventDefault();
      }
      else if ($event.key=="ArrowUp") {
        this.group.upKey();
        $event.preventDefault();
      }
      else if ($event.key=="ArrowRight") {
        this.group.rightKey();
        $event.preventDefault();
      }
      else if ($event.key=="ArrowLeft") {
        this.group.leftKey();
        $event.preventDefault();
      }
      else if ($event.key=="Enter") {
        var selection = this.group.getSelectedItemsWithChildren();
        if (this.selectMode == 'single') {
          if (selection.length)
            this.picked.emit(selection[0]); 
        }
        else {
          this.picked.emit(selection)
        }
      }
    }
  };

  onGroupSelectionChanged($event) {
    this.selectionChanged.emit($event);
  }

  onGroupFocusChanged($event) {
    this.focusChanged.emit($event);
  }

  onItemClicked($event) {
    var selection = this.group.getSelectedItemsWithChildren();
    if (this.selectMode == 'single' && selection.length) 
       this.picked.emit(selection[0]); 
  }

  selectItem(item:any) {
    this.group.selectItem(item);
  }

  focusItem(item:any) {
    this.group.focusItem(item);
  }
}
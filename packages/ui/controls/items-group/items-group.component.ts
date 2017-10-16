import {ViewChildren,forwardRef, QueryList, Host, SimpleChanges, Component, ElementRef, Output,  
  EventEmitter, AfterViewInit,HostListener, OnDestroy, Input, ContentChild, TemplateRef, 
  ChangeDetectorRef, ApplicationRef, ViewEncapsulation} from '@angular/core';
import {Subscription} from 'rxjs';


export interface GroupFocusEvent {
  element:HTMLElement, 
  item: any,
}

@Component({
  selector: 'ast-items-group',
  templateUrl: 'items-group.html',
  //styleUrls: ['items-group.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ItemsGroupComponent implements AfterViewInit, OnDestroy  {
  protected _items:any[];
  @Input('items') set items(value:any[]) {
    if (this._items === value )
      return;
    this._items = value;

    this.expanded = [];
    
    if (this.items) {
      this.items.forEach((item, index) => {
        if ((item[this.expandedAttr] || this.allExpanded) && item[this.childrenAttr] && item[this.childrenAttr].length)
          this.expanded.push(index);
      }); 
    }
    this.currentFocus = null;

    if (this._is_root) {
      this._rFocusedItemsGroupComponent = this; // Текущая сфокусированная группа -- эта
      this.currentSelection = []; 
      this.selectionChanged.emit([]);
    }    
  };

  get items():any[] {
    return this._items;
  }
  @Input('selectType')selectType:string = ['item', 'item_with_parents', 'item_no_parents'][0]; 
  @Input('selectMode')selectMode:string = ['single', 'multiple'][0]; // multiple // тут еще можно было бы подумать по поводу разрешение снятия выделения в single mode
  @Input('itemTemplate') itemTemplate:TemplateRef<any>;
  @Input('childrenAttr') childrenAttr:string; // Название атрибута у item, по которому хранятся потомки 
  @Input('expandedAttr') expandedAttr:string; // Название атрибута у item, который сигнализирует, должна ли быть группа развернута
  @Input('_rootItemsGroupComponent') _rootItemsGroupComponent:ItemsGroupComponent; // Объект родительской группы
  @Input('_parentItem') _parentItem:any[] = null; // Родительски итем
  @Input('_level') _level:number = 0; // _internal
  @Input('allExpanded') allExpanded:boolean = false;
  @Output('focusLeaved') focusLeaved:EventEmitter<number> = new EventEmitter<number>(); //Фокус у группы потерят 0-вверх 1-вниз
  @Output('focusChanged') focusChanged:EventEmitter<GroupFocusEvent> = new EventEmitter<GroupFocusEvent>(); // Применяется только для root-группы
  @Output('selectionChanged') selectionChanged:EventEmitter<any[]> = new EventEmitter<any[]>(); // Применяется только в root-группе. Произошли изменения в какой либо группе, ниже по иерархии
  @Output('_selectionChanged') _selectionChanged:EventEmitter<any[]> = new EventEmitter<any[]>(); // Для информирования группы выше по иерархии, что произошли изменения в группе ниже. Но не обязательно доходит до корня.
  @Output('itemClick') itemClick:EventEmitter<{event:Event, item:any}> = new EventEmitter<{event:Event, item:any}>();
  @ViewChildren(forwardRef(() => ItemsGroupComponent)) groups:QueryList<ItemsGroupComponent>;
  
  private _rFocusedItemsGroupComponent:ItemsGroupComponent; // Если root-группа используется для хранения группы, на которой фокус, чтобы могли быстро убрать этот фокус
  currentSelection:any[] = []; // Хранится выделение в группе
  private _currentFocus:number; // Позиция Item с фокусом
  expanded:number[] = []; // Список позиций, которые раскрыты
  private _is_root:boolean = false; // Явялется ли группа корневой
  private _subs:Subscription; // Подписка root-группы на изменения в самой себе.

  constructor(private elementRef:ElementRef, private cdr:ChangeDetectorRef) {
  }


  ngOnChanges(changes: SimpleChanges) {
    if ('items' in changes) {
    }
  }

  /* Сохраняет группу, в которой находится фокус в данный момент */
  rSetNewFocusedGroup(group:ItemsGroupComponent) {
    if (this._rFocusedItemsGroupComponent != group) {
      if (this._rFocusedItemsGroupComponent)
        this._rFocusedItemsGroupComponent.clearFocus();
      this._rFocusedItemsGroupComponent = group;
    }
  }

  ngAfterViewInit () {
    if (!this._rootItemsGroupComponent) {
      this._rootItemsGroupComponent = this; // Сохраняем ссылку на root-компонент
      this._is_root = true;
      this._rFocusedItemsGroupComponent = this; // Текущая сфокусированная группа -- эта
      this._subs = this._selectionChanged.subscribe(() => {
        this.rSelectionChanged();
      });

      
    }
  }

  ngOnDestroy() {
    if (this._subs) // Т.к. subs -- только для root-группы
      this._subs.unsubscribe();
  }
  
  /* Возвращает Native-элемент для элемента под номером pos */
  getFocusedNative(pos):HTMLElement {
    let children = this.elementRef.nativeElement.children;
    if (children[pos]) {
      return children[pos];
    }
    else {
      return null;
    }
  }
  
  /* Находит элемент item в списке выделенных элементов */
  getPosItemInSelection(item) {
    return this.currentSelection.indexOf(item);
  }

  //e=1;
  /* Проверяет, является ли элемент выделенным */
  isItemSelected(item) {
    return this.getPosItemInSelection(item) !== -1;
  }

  /* Снимает выделения с текущей группы и потомков этой группы */
  deselectAll() {
    this.currentSelection = []; //1
    this.groups.forEach(nextGroupComponent => {
      nextGroupComponent.deselectAll();
    });
  };

  /* Получает список всех выделенных потомков этой группы */
  getSelectedItemsWithChildren() {
    var result = [];
    result.push(...this.currentSelection);
    this.groups.forEach(nextGroupComponent => {
      result.push(...nextGroupComponent.getSelectedItemsWithChildren())
    });
    return result;
  }

  /* Группы потомки информирую root-группу, об их изменениях в выделении, чтобы root-группа уведомила высший компонент */
  rSelectionChanged() {
    this.selectionChanged.emit(this.getSelectedItemsWithChildren());
  }

  /* Выделить элемент. */
  selectItem(item, noClear=false) {
    if (!this.isItemSelected(item)) {
      if (this.items.indexOf(item) == -1) {
        this.groups.forEach(group=>{
          group.selectItem(item);
        })
        return;
      }
      if (this.selectType == 'item' || this.selectType == 'item_with_parents' || (this.selectType == 'item_no_parents' && !item[this.childrenAttr])) {
        if (this.selectMode=='single' && noClear==false) 
          this._rootItemsGroupComponent.deselectAll(); 
        this.currentSelection.push(item); //1
        this._selectionChanged.emit(this.currentSelection);
      }
    }
  }

  /* Снять выделение у элемента. */
  deselectItem(item) {
    var pos = this.getPosItemInSelection(item);
    if (pos !== -1) {
      this.currentSelection.splice(pos, 1); //1
      if (item[this.childrenAttr]) {
        this.groups.forEach(nextGroupComponent => {
          if (nextGroupComponent.items == item[this.childrenAttr]) {
            nextGroupComponent.deselectAll();
          }
        });
      }
      this._selectionChanged.emit(this.currentSelection.length>0 && this.currentSelection || null);
    }
  }

  /* Произошли изменения в выделении в группе, уровнем ниже. -- Реагируем на это. */
  onChildGroupSelectionChanged(childSelection, parentItem) {
    if (this.selectType == 'item_with_parents') {
      if (childSelection && childSelection.length)
        this.selectItem(parentItem, true);
      else 
        this.deselectItem(parentItem);
    }
    this._rootItemsGroupComponent.rSelectionChanged();
  }

  /* Снимает фокус с текущей группы и всех потомков этой группы. Используется, например, когда надо свернуть группу */
  clearFocus() {
    this._currentFocus = null;
    this.groups.forEach(nextGroupComponent => {
      nextGroupComponent.clearFocus();
    });
  }

  onItemClick($event, item) {
    if (!this.isItemSelected(item)){
      this.selectItem(item);
    }
    else if (this.selectMode != 'single')
      this.deselectItem(item);

    this.currentFocus = this.items.indexOf(item);
    this._rootItemsGroupComponent.itemClick.emit({event:$event, item:item});
  } 

  get currentFocus():number {
    return this._currentFocus;
  }

  set currentFocus(value:number) {
    if (this._currentFocus != value) {
      
      if (value!=null) {
        if (this.selectMode == 'single')
          this.selectItem(this.items[value]);
        this._rootItemsGroupComponent.rSetNewFocusedGroup(this); // Указываем какая группа будет нести фокус
        this._rootItemsGroupComponent.focusChanged.emit({element: this.getFocusedNative(value), item: this.items[value] }); // Информируем на каком элементе сейчас фокус, используется для аргонизации авто-прокрутки.
      }
      else {
        if (this.selectMode == 'single' && this.selectType=='item_with_parents')
          this.deselectItem(this.items[this._currentFocus]);
      }
      this._currentFocus = value;
      this.cdr.detectChanges();
    }
  }

  /* Проверяем, находится дли фокус в группе */
  isFocusInGroup() {
    if (this.currentFocus != null)
      return true;

    this.groups.forEach(nextGroupComponent => {
      if (nextGroupComponent.isFocusInGroup())
        return true;
    });
    return false;

  }

  /* Раскрыть элемент в позиции i */
  expandItem(i) {
    if (this.items[i][this.childrenAttr])
      this.expanded.push(i);
  }

  /* Свернуть элемент в позиции i */
  collapseItem(i) {
    var index = this.expanded.indexOf(i);
    if (index != -1) {
      this.expanded.splice(index, 1);
      this.groups.forEach(nextGroupComponent => { // Если фокус в какой-либо из групп ниже -- переносим фокус на элемент по которому кликнули
        if (nextGroupComponent._parentItem == this.items[i]) {
          if (nextGroupComponent.isFocusInGroup())
            this.currentFocus = i;
          return;
        }
      });
    }
  }

  /* Открывает-закрывает группу под номером i */
  toogleItem(i) {
    this.isItemExpanded(i) ? this.collapseItem(i) : this.expandItem(i);
  }

  /* Проверяет, является ли позиция раскрытой */
  isItemExpanded(i) {
    return this.expanded.indexOf(i) !== -1;
  }

  focusItem(item:any) {
    var itemPos = this.items.indexOf(item);
    if (itemPos !== -1) 
      this.currentFocus = itemPos;
  }

  /* Переместить фокус на следующую строку */
  focusNext() {
    if (this.currentFocus==null) {
      this.currentFocus = 0;
    }
    else if (this.expanded.indexOf(this.currentFocus) !== -1 ) {
      this.groups.forEach(nextGroupComponent => {
        if (nextGroupComponent._parentItem == this.items[this.currentFocus]) {
          nextGroupComponent.focusNext();
          return false;
        }
      });
      this.currentFocus = null; //TODO
    }
    else {
      if (this.items.length-2 >= this.currentFocus) {
        this.currentFocus = this.currentFocus+1;
      }
      else {
        if (this._is_root) {
          this.currentFocus = 0
        }
        else {
          this.currentFocus = null;
          this.focusLeaved.emit(1);
        }
      }
    }
  }

  /* Переместить фокус на предыдущую строку */
  focusPrev() {
    var possible_focus;
    if (this.currentFocus==null) {
      possible_focus = this.items.length - 1;
    }
    else if (this.currentFocus == 0) {
      if (this._is_root) {
        possible_focus = this.items.length - 1;
      }
      else {
        this.currentFocus=null;
        this.focusLeaved.emit(0);
        return;
      }
    }
    else {
      possible_focus = this.currentFocus-1;
    }

    if (this.expanded.indexOf(possible_focus) !== -1) {
      this.groups.forEach(nextGroupComponent => {
        if (nextGroupComponent._parentItem == this.items[possible_focus]) {
          nextGroupComponent.focusPrev();
          return false;
        }
      });

    }
    else {
      this.currentFocus = possible_focus;
    }

  }

  /* Достигнут конец группы. Для групп потомков, фокус теряется, для root, переходит на начало группы */
  onFocusLeaved($event, i) {
    if ($event == 1) {
      if (this.items.length-1 >= i+1) {
        this.currentFocus = i+1;
      }
      else {
        if (this._is_root) {
          this.currentFocus = 0
        }
        else {
          this.currentFocus = null;
          this.focusLeaved.emit(1);
        }
      }
    }
    else if ($event == 0) {
      this.currentFocus = i;
    }
  }

  downKey() {
    this._rFocusedItemsGroupComponent.focusNext();
  }

  upKey() {
    this._rFocusedItemsGroupComponent.focusPrev();
  }

  rightKey() {
    if (this._rFocusedItemsGroupComponent.currentFocus != null)
      this._rFocusedItemsGroupComponent.expandItem(this._rFocusedItemsGroupComponent.currentFocus)
  }

  leftKey() {
    if (this._rFocusedItemsGroupComponent.currentFocus != null)
      this._rFocusedItemsGroupComponent.collapseItem(this._rFocusedItemsGroupComponent.currentFocus)
  }

 
}
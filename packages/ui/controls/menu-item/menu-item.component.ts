import {Component, Input, ContentChild, forwardRef, AfterViewInit, HostListener, OnDestroy, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {PopupMenuComponent} from '../popup-menu/popup-menu.component';
import {Subscription} from 'rxjs';
import {PopupDispatcher} from '../../services/popup-dispatcher';

export interface MenuItemParams {
  text:string
}


@Component({
  selector: 'ast-menu-item',
  templateUrl: './menu-item.html',
//  styleUrls: ['./menu-item.css'],
  providers: [PopupDispatcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemComponent implements AfterViewInit, OnDestroy, MenuItemParams{
  @ContentChild(forwardRef(() => PopupMenuComponent)) popupMenu:PopupMenuComponent;
  @Input('text') text:string = '';
  @Output('stateChanged') stateChanged = new EventEmitter<{item: any, state: boolean}>();
  
  private _active:boolean;
  set active(val:boolean) {
    if (val == this._active)
      return;
    this._active = val;
    this.cdr.markForCheck();
  }

  get active():boolean {
    return this._active;
  }

  private openTimer;
  private closeTimer;
  private subscriptions:Subscription[] = [];

  _positions = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
    },    
  ];

  constructor(private popupDispatcher:PopupDispatcher, protected cdr:ChangeDetectorRef) {
    var s = popupDispatcher.clickedOuside.subscribe(() => {
      this.close();
    });
    this.subscriptions.push(s);

    var s = popupDispatcher.popupLeaved.subscribe(() => {
      this.close();
    });
    this.subscriptions.push(s);

    var s = popupDispatcher.picked.subscribe(val => {
      this.close();
    });
    this.subscriptions.push(s);
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  open() {
    if (this.active)
      return;
    this.active = true;
    this.popupDispatcher.open();
    this.stateChanged.emit({item:this, state:true});
  }

  close() {
    if (!this.active)
      return

    this.active = false;
    this.popupDispatcher.close();
    this.stateChanged.emit({item:this, state:false});
    this.cdr.detectChanges();
  }

  itemEnter() {
    this.popupDispatcher.mouseEntered();
    clearTimeout(this.closeTimer);
    this.openTimer = setTimeout(() => { // Даем время, чтобы мимолетно пролетевшая мышка над пунктом не открыла его
      this.open();
    }, 130);
  }

  itemLeaved() {
    clearTimeout(this.openTimer);
    this.closeTimer = setTimeout(() => { // Даем время перевести мышку на всплывающий popup
      this.close();
    }, 5);
  }

  itemClicked() {
    this.popupDispatcher.clickedInside();
    this.open(); 
    //this.active ? this.close() : this.open();
  }

  popupEnter() {
    clearTimeout(this.closeTimer);
  }
}
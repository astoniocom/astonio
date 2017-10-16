import {Component, ViewEncapsulation, ViewChildren, ViewChild, ContentChildren, AfterViewInit, ChangeDetectionStrategy, QueryList, forwardRef, ViewContainerRef, ContentChild,
  Output,  EventEmitter, OnDestroy, Optional} from '@angular/core';
import {PopupMenuItemComponent} from '../popup-menu-item/popup-menu-item.component';
import {Subscription} from 'rxjs';
import {PopupDispatcher} from '../../services/popup-dispatcher';

@Component({
  selector: 'ast-popup-menu', 
  templateUrl: './popup-menu.html',
  //styleUrls: ['./popup-menu.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupMenuComponent implements AfterViewInit, OnDestroy {
  @ContentChildren(forwardRef(() => PopupMenuItemComponent), {descendants: false}) menuItems:QueryList<PopupMenuItemComponent>;
  private subscriptions:Subscription[] = [];

  constructor (private popupDispatcher:PopupDispatcher) {
    popupDispatcher.registerChildren();
    var s = popupDispatcher.closePopup.subscribe(() => {
      this.close()
    });
    this.subscriptions.push(s);
  }

  ngAfterViewInit() {
    this.menuItems.forEach(mi => {
      var s = mi.stateChanged.subscribe(res => {
        if (res.state) {
          this.menuItems.forEach(mi2 => {
            if (mi2 !== mi)
              mi2.close();
          });
        }
      })
      this.subscriptions.push(s);
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  close() {
    this.menuItems.forEach(mi2 => {
      mi2.close();
    });
  }

  popupenter() {
    this.popupDispatcher.mouseEntered();
  }

  popupleave() {
    this.popupDispatcher.mouseLeaved();
  }

  popupclick() {
    this.popupDispatcher.clickedInside();
  }
}
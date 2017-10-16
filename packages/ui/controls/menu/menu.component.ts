import {Component, ContentChildren, forwardRef, QueryList, AfterViewInit, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {MenuItemComponent} from '../menu-item/menu-item.component';
import {Subscription} from 'rxjs';

@Component({
  selector: 'ast-menu',
  templateUrl: './menu.html',
//  styleUrls: ['./menu.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements AfterViewInit, OnDestroy {
  @ContentChildren(forwardRef(() => MenuItemComponent), {descendants: false}) menuItems:QueryList<MenuItemComponent>;
  private subscriptions:Subscription[] = [];

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
}
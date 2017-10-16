import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: "ast-tab",
  templateUrl: "./tab.html",
//  styleUrls: ["./tab.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabComponent {
  @Input() title:string;
  @Input() active:boolean;
}
import {Subject} from 'rxjs/Subject';

export enum LabelsChangedAction {
  Added,
  Removed
}

export interface LabelsChangedEvent {
  action: LabelsChangedAction,
  label: string
}

export class Labels {
  changed: Subject<LabelsChangedEvent>;

  labels:string[] = [];
  
  constructor() {
    this.changed = new Subject<LabelsChangedEvent>();
  }

  setLabel(name:string) {
    if (!this.hasLabel(name)) {
      this.labels.push(name);
      this.changed.next({action: LabelsChangedAction.Added, label: name});
    }
  }
  
  hasLabel(name:string) {
    return this.labels.indexOf(name) != -1;  
  }
  
  delLabel(name:string) {
    let nlabel = this.labels.indexOf(name);
    if (nlabel !== -1) {
      this.labels.splice(nlabel, 1);
      this.changed.next({action: LabelsChangedAction.Removed, label: name});
    }
  }
  
  clear() {
    this.labels.forEach(label => {
      this.delLabel(name);
    });
  }
} 
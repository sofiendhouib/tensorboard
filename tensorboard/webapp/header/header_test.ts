/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSelectModule} from '@angular/material/select';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {MatIconTestingModule} from '../testing/mat_icon.module';
import {HeaderComponent} from './header_component';
import {PluginSelectorComponent} from './plugin_selector_component';
import {PluginSelectorContainer} from './plugin_selector_container';
import {ReloadContainer} from './reload_container';
import {getPluginsListLoaded} from '../core/store/core_selectors';
import {DataLoadState} from '../types/data';

import {changePlugin, manualReload} from '../core/actions';
import {State} from '../core/store';
import {
  createPluginMetadata,
  createState,
  createCoreState,
} from '../core/testing';
import {PluginId} from '../types/api';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('header test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatButtonModule,
        MatIconTestingModule,
        MatSelectModule,
        MatTabsModule,
        MatToolbarModule,
        NoopAnimationsModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              plugins: {
                foo: createPluginMetadata('Foo Fighter'),
                bar: createPluginMetadata('Barber'),
              },
            })
          ),
        }),
        HeaderComponent,
      ],
      declarations: [
        HeaderComponent,
        PluginSelectorComponent,
        PluginSelectorContainer,
        ReloadContainer,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  function assertDebugElementText(el: DebugElement, text: string) {
    expect(el.nativeElement.innerText.trim().toUpperCase()).toBe(text);
  }

  function setActivePlugin(activePlugin: PluginId) {
    store.setState(
      createState(
        createCoreState({
          plugins: {
            foo: createPluginMetadata('Foo Fighter'),
            bar: createPluginMetadata('Barber'),
          },
          activePlugin,
        })
      )
    );
  }

  it('renders pluginsList', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const els = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(els.length).toBe(2);

    assertDebugElementText(els[0], 'FOO FIGHTER');
    assertDebugElementText(els[1], 'BARBER');
  });

  it('updates list of tabs when pluginsList updates', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const nextState = createState(
      createCoreState({
        plugins: {
          cat: createPluginMetadata('Meow'),
          dog: createPluginMetadata('Woof'),
          elephant: createPluginMetadata('Trumpet'),
        },
      })
    );
    store.setState(nextState);
    fixture.detectChanges();
    await fixture.whenStable();

    const els = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(els.length).toBe(3);
    assertDebugElementText(els[0], 'MEOW');
    assertDebugElementText(els[1], 'WOOF');
    assertDebugElementText(els[2], 'TRUMPET');
  });

  it('selects 0th element by default', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(0);
  });

  it('sets tab group selection to match index of activePlugin', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    setActivePlugin('bar');
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(1);
  });

  it('fires an action when a tab is clicked', async () => {
    const dispatch = spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const [, barEl] = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    barEl.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(changePlugin({plugin: 'bar'}));
  });

  describe('reload', () => {
    it('dispatches manual reload when clicking on the reload button', () => {
      const dispatch = spyOn(store, 'dispatch');
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      button.nativeElement.click();
      fixture.detectChanges();

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(manualReload());
    });

    it('renders the time of refresh in title', () => {
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: new Date('2000/01/01').getTime(),
      });
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(button.properties['title']).toBe(
        'Last Updated: Jan 1, 2000, 12:00:00 AM'
      );
    });

    it('renders "Loading" if it was never loaded before', () => {
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(button.properties['title']).toBe('Loading...');
    });

    it('spins the indicator when loading', () => {
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const buttonBefore = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonBefore.classes['loading']).toBe(false);

      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      store.refreshState();
      fixture.detectChanges();

      const buttonAfter = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonAfter.classes['loading']).toBe(true);
    });

    it('stops spinner when going from loading to loaded', () => {
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const buttonBefore = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonBefore.classes['loading']).toBe(true);

      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1,
      });
      store.refreshState();
      fixture.detectChanges();

      const buttonAfter = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonAfter.classes['loading']).toBe(false);
    });
  });
});

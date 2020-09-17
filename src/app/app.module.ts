import { AgGridModule } from '@ag-grid-community/angular'
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api'
import { AppComponent } from './app.component'
import { InMemoryService } from './mocks/in-memory-db-service'

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    HttpClientInMemoryWebApiModule.forRoot(InMemoryService, {
      // tell the mock endpoint to return the entity on put
      put204: false,
    }),
    AgGridModule.withComponents([]),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

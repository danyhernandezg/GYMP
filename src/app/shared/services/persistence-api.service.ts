import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface PersistedItem {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type CreatePersistedItem = Pick<PersistedItem, 'name'> & Partial<Pick<PersistedItem, 'description' | 'status'>>;
export type UpdatePersistedItem = Partial<CreatePersistedItem>;

@Injectable({
  providedIn: 'root'
})
export class PersistenceApiService {
  private readonly apiUrl = '/api/items';

  constructor(private readonly http: HttpClient) {}

  listItems() {
    return this.http.get<PersistedItem[]>(this.apiUrl);
  }

  createItem(item: CreatePersistedItem) {
    return this.http.post<PersistedItem>(this.apiUrl, item);
  }

  updateItem(id: string, item: UpdatePersistedItem) {
    return this.http.patch<PersistedItem>(`${this.apiUrl}/${id}`, item);
  }

  deleteItem(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

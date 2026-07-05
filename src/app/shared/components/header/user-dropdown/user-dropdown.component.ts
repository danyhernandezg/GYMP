import { Component } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { AuthApiService } from '../../../services/auth-api.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;

  constructor(public readonly auth: AuthApiService) {}

  getDisplayName() {
    const user = this.auth.getUser();

    if (!user) {
      return 'Admin';
    }

    const profileUser = user as { firstName?: string; lastName?: string; username?: string };
    const name = `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim();

    return name || profileUser.username || 'Admin';
  }

  getInitials() {
    return this.getDisplayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AD';
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  signOut() {
    this.closeDropdown();
    this.auth.logout();
  }
}

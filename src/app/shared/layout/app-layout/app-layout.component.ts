import { Component } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { BackdropComponent } from '../backdrop/backdrop.component';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { ModalComponent } from '../../components/ui/modal/modal.component';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    AppSidebarComponent,
    BackdropComponent,
    ModalComponent
  ],
  templateUrl: './app-layout.component.html',
})

export class AppLayoutComponent {
  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;
  showStudentPricingModal = false;

  constructor(
    public sidebarService: SidebarService,
    private readonly auth: AuthApiService
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  ngOnInit() {
    const shouldShowPricing = sessionStorage.getItem('show_student_pricing_modal') === 'true';
    const user = this.auth.getUser();

    if (shouldShowPricing && user?.role === 'alumno') {
      this.showStudentPricingModal = true;
      sessionStorage.removeItem('show_student_pricing_modal');
    }
  }

  closeStudentPricingModal() {
    this.showStudentPricingModal = false;
  }

  get containerClasses() {
    return [
      'flex-1',
      'transition-all',
      'duration-300',
      'ease-in-out',
      (this.isExpanded$ || this.isHovered$) ? 'xl:ml-[290px]' : 'xl:ml-[90px]',
      this.isMobileOpen$ ? 'ml-0' : ''
    ];
  }

}

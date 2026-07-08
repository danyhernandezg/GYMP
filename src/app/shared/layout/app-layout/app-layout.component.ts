import { Component, HostListener } from '@angular/core';
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
  showPwaInstallBar = false;
  deferredInstallPrompt: any = null;

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

    this.showPwaInstallBar = this.shouldShowPwaInstallBar();
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredInstallPrompt = event;
    this.showPwaInstallBar = this.shouldShowPwaInstallBar();
  }

  closeStudentPricingModal() {
    this.showStudentPricingModal = false;
  }

  async installPwa() {
    if (!this.deferredInstallPrompt) {
      this.dismissPwaInstallBar();
      return;
    }

    this.deferredInstallPrompt.prompt();
    await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    this.dismissPwaInstallBar();
  }

  dismissPwaInstallBar() {
    localStorage.setItem('pwa_install_bar_dismissed', 'true');
    this.showPwaInstallBar = false;
  }

  private shouldShowPwaInstallBar() {
    const dismissed = localStorage.getItem('pwa_install_bar_dismissed') === 'true';
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    return !dismissed && !standalone;
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

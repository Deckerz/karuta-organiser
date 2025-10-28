import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { CardStoreService } from './services/card-store.service';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/import/import.page').then(m => m.ImportPage),
	},
	{
		path: 'cards',
		loadComponent: () => import('./pages/cards/cards.page').then(m => m.CardsPage),
		canActivate: [() => {
			const store = inject(CardStoreService);
			return store.count() > 0 ? true : inject(Router).createUrlTree(['/']);
		}],
	},
	{ path: '**', redirectTo: '' },
];

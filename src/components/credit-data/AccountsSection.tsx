'use client'

import React, { useState, useMemo } from 'react'
import { AccountsSectionProps, CreditAccount } from '@/types/credit-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AccountCard } from './cards/AccountCard'
import { AccountDetailsModal } from './modals/AccountDetailsModal'
import { ResponsiveGrid, ResponsiveStack, MobileModal } from '@/components/ui/ResponsiveSection'
import { useResponsive } from '@/hooks/useResponsive'
import { CreditCard, Search, Filter, Grid, List, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react'

export function AccountsSection({
  accounts,
  onAccountSelect,
  selectedAccount,
  viewMode: initialViewMode = 'cards'
}: AccountsSectionProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(initialViewMode)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'creditor' | 'balance' | 'date' | 'status'>('creditor')
  const [filterType, setFilterType] = useState<'all' | 'credit_card' | 'loan' | 'mortgage'>('all')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { isMobile, isTablet } = useResponsive()

  // Filter and sort accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = accounts.filter(account => {
      const matchesSearch = account.creditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'credit_card' && account.accountType === 'credit_card') ||
                           (filterType === 'loan' && ['auto_loan', 'personal_loan', 'student_loan'].includes(account.accountType)) ||
                           (filterType === 'mortgage' && account.accountType === 'mortgage')
      
      return matchesSearch && matchesFilter
    })

    // Sort accounts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'creditor':
          return a.creditorName.localeCompare(b.creditorName)
        case 'balance':
          return b.balance - a.balance
        case 'date':
          return new Date(b.lastReported).getTime() - new Date(a.lastReported).getTime()
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return filtered
  }, [accounts, searchTerm, sortBy, filterType])

  // Calculate summary statistics
  const accountStats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const totalCreditLimit = accounts.reduce((sum, acc) => sum + (acc.creditLimit || 0), 0)
    const utilizationRate = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0
    const openAccounts = accounts.filter(acc => acc.status === 'open').length
    const problemAccounts = accounts.filter(acc => ['charged_off', 'collection'].includes(acc.status)).length

    return {
      totalBalance,
      totalCreditLimit,
      utilizationRate,
      openAccounts,
      problemAccounts,
      totalAccounts: accounts.length
    }
  }, [accounts])

  const handleAccountClick = (accountId: string) => {
    onAccountSelect(accountId)
    setShowDetailsModal(true)
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />
      case 'auto_loan':
        return <TrendingUp className="w-4 h-4" />
      case 'mortgage':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  const selectedAccountData = selectedAccount ? accounts.find(acc => acc.id === selectedAccount) : null

  return (
    <div className="mobile-spacing-md">
      {/* Account Summary Statistics */}
      <div className="mobile-stat-grid">
        <div className="mobile-stat-card">
          <ResponsiveStack
            direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="center"
            spacing="gap-3"
          >
            <div className="flex-1">
              <p className="mobile-stat-label">Total Accounts</p>
              <p className="mobile-stat-value text-gray-900 dark:text-white">
                {accountStats.totalAccounts}
              </p>
            </div>
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
          </ResponsiveStack>
        </div>

        <div className="mobile-stat-card">
          <ResponsiveStack
            direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="center"
            spacing="gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="mobile-stat-label">Total Balance</p>
              <p className="mobile-stat-value text-gray-900 dark:text-white truncate">
                ${accountStats.totalBalance.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
          </ResponsiveStack>
        </div>

        <div className="mobile-stat-card">
          <ResponsiveStack
            direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="center"
            spacing="gap-3"
          >
            <div className="flex-1">
              <p className="mobile-stat-label">Utilization</p>
              <p className={`mobile-stat-value ${
                accountStats.utilizationRate > 30 ? 'text-red-600' : 
                accountStats.utilizationRate > 10 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {accountStats.utilizationRate.toFixed(1)}%
              </p>
            </div>
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
              accountStats.utilizationRate > 30 ? 'bg-red-100 text-red-600' : 
              accountStats.utilizationRate > 10 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
            }`}>
              %
            </div>
          </ResponsiveStack>
        </div>

        <div className="mobile-stat-card">
          <ResponsiveStack
            direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="center"
            spacing="gap-3"
          >
            <div className="flex-1">
              <p className="mobile-stat-label">Problem Accounts</p>
              <p className={`mobile-stat-value ${
                accountStats.problemAccounts > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {accountStats.problemAccounts}
              </p>
            </div>
            <AlertTriangle className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${
              accountStats.problemAccounts > 0 ? 'text-red-500' : 'text-green-500'
            }`} />
          </ResponsiveStack>
        </div>
      </div>

      {/* Main Accounts Card */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <ResponsiveStack
            direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="start"
            spacing="gap-4"
          >
            <h3 className="mobile-subtitle flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Accounts ({filteredAndSortedAccounts.length})
            </h3>
            
            {/* Mobile Controls */}
            {isMobile ? (
              <div className="w-full space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="touch-input pl-10 w-full"
                  />
                </div>
                
                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="touch-button w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters & Sort
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Collapsible Filters */}
                {showFilters && (
                  <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="touch-input w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="all">All Types</option>
                      <option value="credit_card">Credit Cards</option>
                      <option value="loan">Loans</option>
                      <option value="mortgage">Mortgages</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="touch-input w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="creditor">Sort by Creditor</option>
                      <option value="balance">Sort by Balance</option>
                      <option value="date">Sort by Date</option>
                      <option value="status">Sort by Status</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Controls */
              <ResponsiveStack
                direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
                spacing="gap-2"
                className="flex-wrap"
              >
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>

                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="credit_card">Credit Cards</option>
                  <option value="loan">Loans</option>
                  <option value="mortgage">Mortgages</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="creditor">Sort by Creditor</option>
                  <option value="balance">Sort by Balance</option>
                  <option value="date">Sort by Date</option>
                  <option value="status">Sort by Status</option>
                </select>

                {/* View Mode Toggle - Hidden on mobile since we force cards */}
                <div className="hidden sm:flex border border-gray-300 dark:border-gray-600 rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </ResponsiveStack>
            )}
          </ResponsiveStack>
        </div>
        <div className="mobile-card-content">
          {filteredAndSortedAccounts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CreditCard className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="mobile-subtitle text-gray-900 dark:text-white mb-2">
                {accounts.length === 0 ? 'No Accounts Found' : 'No Matching Accounts'}
              </h4>
              <p className="mobile-body text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {accounts.length === 0 
                  ? 'No credit accounts were found in this report.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (isMobile || viewMode === 'cards') ? (
            <ResponsiveGrid
              columns={{ mobile: 1, tablet: 2, desktop: 3 }}
              gap="gap-4"
            >
              {filteredAndSortedAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onClick={() => handleAccountClick(account.id)}
                  isSelected={selectedAccount === account.id}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Creditor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Balance</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Limit</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedAccounts.map((account) => (
                    <tr 
                      key={account.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => handleAccountClick(account.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(account.accountType)}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {account.creditorName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {account.accountNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 capitalize">
                        {account.accountType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                        ${account.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        {account.creditLimit ? `$${account.creditLimit.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.status === 'open' ? 'bg-green-100 text-green-800' :
                          account.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          account.status === 'charged_off' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {account.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAccountClick(account.id)
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Account Details Modal - Mobile Optimized */}
      {showDetailsModal && selectedAccountData && (
        isMobile ? (
          <MobileModal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            title={`${selectedAccountData.creditorName} Account`}
            size="full"
          >
            <AccountDetailsModal
              account={selectedAccountData}
              isOpen={showDetailsModal}
              onClose={() => setShowDetailsModal(false)}
            />
          </MobileModal>
        ) : (
          <AccountDetailsModal
            account={selectedAccountData}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
          />
        )
      )}
    </div>
  )
}
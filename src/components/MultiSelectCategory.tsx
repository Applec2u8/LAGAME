import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { Search, Plus, Check, X } from 'lucide-react'
import type { Category } from '../lib/supabase'

const Container = styled.div`
  position: relative;
  width: 100%;
`

const SelectedTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
`

const Tag = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
`

const RemoveTagBtn = styled.button`
  background: none; border: none; padding: 0; color: rgba(255,255,255,0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { color: #ef4444; }
`

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`

const Input = styled.input`
  width: 100%;
  padding: 10px 14px 10px 36px;
  background: rgba(8, 8, 16, 0.8);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  font-family: 'Noto Sans Lao', sans-serif;
  &:focus { border-color: rgba(124, 58, 237, 0.5); }
  &::placeholder { color: rgba(148, 163, 184, 0.4); }
`

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(148, 163, 184, 0.5);
`

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #12121f;
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
`

const Option = styled.div<{ $selected: boolean }>`
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: ${p => p.$selected ? '#fff' : 'rgba(148,163,184,0.8)'};
  background: ${p => p.$selected ? 'rgba(124, 58, 237, 0.1)' : 'transparent'};
  font-size: 14px;
  &:hover {
    background: rgba(124, 58, 237, 0.15);
    color: #fff;
  }
`

const AddOption = styled(Option)`
  color: #a855f7;
  font-weight: 600;
  gap: 8px;
  justify-content: flex-start;
`

type Props = {
  categories: Category[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onAddCategory: (name: string) => void
}

export default function MultiSelectCategory({ categories, selectedIds, onChange, onAddCategory }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
  
  // Check if exact match exists
  const exactMatchExists = categories.some(c => c.name.toLowerCase() === query.toLowerCase().trim())

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(v => v !== id))
    } else {
      onChange([...selectedIds, id])
    }
    // Keep dropdown open for multiple selections
  }

  const handleAdd = () => {
    if (query.trim() && !exactMatchExists) {
      onAddCategory(query.trim())
      setQuery('')
    }
  }

  return (
    <Container ref={containerRef}>
      {selectedIds.length > 0 && (
        <SelectedTags>
          {selectedIds.map(id => {
            const cat = categories.find(c => c.id === id)
            if (!cat) return null
            return (
              <Tag key={id}>
                {cat.name}
                <RemoveTagBtn onClick={() => toggleCategory(id)} type="button">
                  <X size={12} strokeWidth={3} />
                </RemoveTagBtn>
              </Tag>
            )
          })}
        </SelectedTags>
      )}

      <SearchInputWrapper>
        <SearchIcon size={14} />
        <Input
          placeholder="Search categories... (or type to add new)"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
      </SearchInputWrapper>

      {isOpen && (
        <Dropdown>
          {filteredCategories.map(cat => {
            const isSelected = selectedIds.includes(cat.id)
            return (
              <Option key={cat.id} $selected={isSelected} onClick={() => toggleCategory(cat.id)}>
                {cat.name}
                {isSelected && <Check size={14} color="#a855f7" />}
              </Option>
            )
          })}

          {query.trim().length > 0 && !exactMatchExists && (
            <AddOption $selected={false} onClick={handleAdd}>
              <Plus size={14} />
              Add "{query.trim()}"
            </AddOption>
          )}

          {filteredCategories.length === 0 && !query.trim() && (
            <div style={{ padding: '10px 14px', color: 'rgba(148,163,184,0.5)', fontSize: 13 }}>
              No categories available.
            </div>
          )}
        </Dropdown>
      )}
    </Container>
  )
}

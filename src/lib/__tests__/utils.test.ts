describe('Utils', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    const str = 'Hello World'
    expect(str.toLowerCase()).toBe('hello world')
  })

  it('should handle arrays', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(1)
  })
})
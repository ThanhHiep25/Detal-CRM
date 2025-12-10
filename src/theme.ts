import { createTheme } from '@mui/material/styles';
import { blue, grey } from '@mui/material/colors';

export const theme = createTheme({
  palette: {
    primary: {
      main: blue[600],
    },
    background: {
      default: grey[50], // Màu nền chính của trang
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  components: {
    // Tùy chỉnh mặc định cho tất cả TextField
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
        InputLabelProps: { shrink: true }, // Luôn hiển thị label ở trên
      },
      styleOverrides: {
        root: {
          '.MuiFilledInput-root': {
            backgroundColor: grey[200],
            '&:hover': {
              backgroundColor: grey[300],
            },
            '&.Mui-focused': {
              backgroundColor: grey[200],
            },
            '&::before, &::after': { // Bỏ gạch chân
              display: 'none',
            },
          },
        },
      },
    },
    // Tùy chỉnh mặc định cho tất cả Select
    MuiSelect: {
        defaultProps: {
            variant: 'filled',
        },
        styleOverrides: {
            root: {
                '.MuiFilledInput-root': {
                    backgroundColor: grey[200],
                    '&:hover': {
                        backgroundColor: grey[300],
                    },
                    '&.Mui-focused': {
                        backgroundColor: grey[200],
                    },
                    '&::before, &::after': {
                        display: 'none',
                    },
                }
            }
        }
    },
    // Style cho ToggleButton
    MuiToggleButton: {
        styleOverrides: {
            root: {
                '&.Mui-selected': {
                    backgroundColor: blue[50],
                    color: blue[600],
                    fontWeight: 'bold',
                }
            }
        }
    }
  },
});
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productById = await api
        .get<Product>(`products/${productId}`)
        .then((product) => product.data);

      const stockById = await api
        .get<Stock>(`stock/${productId}`)
        .then((stock) => stock.data);

      const inCart = cart.find((product) => product.id === productById.id);
      if (inCart) {
        const newAmount = inCart.amount + 1;
        if (newAmount > stockById.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          inCart.amount = newAmount;
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));
          setCart([...cart]);
        }
      } else {
        productById.amount = 1;
        if (productById.amount > stockById.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, productById])
          );
          setCart([...cart, productById]);
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const indexProduct = cart.findIndex((item) => item.id === productId);
      if (indexProduct < 0) {
        throw Error();
      }
      cart.splice(indexProduct, 1);

      setCart([...cart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockById = await api
        .get<Stock>(`stock/${productId}`)
        .then((stock) => stock.data);

      if (amount <= stockById.amount) {
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount = amount;
          }

          return product;
        });
        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...newCart]));
        setCart([...newCart]);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

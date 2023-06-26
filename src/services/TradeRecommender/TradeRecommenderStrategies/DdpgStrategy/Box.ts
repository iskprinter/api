// import * as tf from '@tensorflow/tfjs-node';

// // Based on https://github.com/openai/gym/blob/master/gym/spaces/box.py
// // Implementation of a space that represents closed boxes in euclidean space."""

// // def _short_repr(arr: np.ndarray) -> str:
// //     """Create a shortened string representation of a numpy array.

// //     If arr is a multiple of the all-ones vector, return a string representation of the multiplier.
// //     Otherwise, return a string representation of the entire array.

// //     Args:
// //         arr: The array to represent

// //     Returns:
// //         A short representation of the array
// //     """
// //     if arr.size != 0 and np.min(arr) == np.max(arr):
// //         return str(np.min(arr))
// //     return str(arr)


// // def is_float_integer(var) -> bool:
// //     """Checks if a variable is an integer or float."""
// //     return np.issubdtype(type(var), np.integer) or np.issubdtype(type(var), np.floating)

// /*
//  * A (possibly unbounded) box in :math:`\mathbb{R}^n`.
//  * 
//  * Specifically, a Box represents the Cartesian product of n closed intervals.
//  * Each interval has the form of one of :math:`[a, b]`, :math:`(-\infty, b]`,
//  * :math:`[a, \infty)`, or :math:`(-\infty, \infty)`.
//  * 
//  * There are two common use cases:
//  * 
//  * * Identical bound for each dimension::
//  * 
//  *     >>> Box(low=-1.0, high=2.0, shape=(3, 4), dtype=np.float32)
//  *     Box(3, 4)
//  * 
//  * * Independent bound for each dimension::
//  * 
//  *     >>> Box(low=np.array([-1.0, -2.0]), high=np.array([2.0, 4.0]), dtype=np.float32)
//  *     Box(2,)
//  */
// export default class Box {

//   boundedAbove: tf.Tensor;
//   boundedBelow: tf.Tensor;
//   high: tf.Tensor;
//   low: tf.Tensor;
//   seed?: number;
//   shape: number[];

//   /*
//    * Constructor of :class:`Box`.
//    * 
//    * The argument ``low`` specifies the lower bound of each dimension and ``high`` specifies the upper bounds.
//    * I.e., the space that is constructed will be the product of the intervals :math:`[\text{low}[i], \text{high}[i]]`.
//    * 
//    * If ``low`` (or ``high``) is a scalar, the lower bound (or upper bound, respectively) will be assumed to be
//    * this value across all dimensions.
//    * 
//    * Args:
//    *     low (Union[SupportsFloat, np.ndarray]): Lower bounds of the intervals.
//    *     high (Union[SupportsFloat, np.ndarray]): Upper bounds of the intervals.
//    *     shape (Optional[Sequence[int]]): The shape is inferred from the shape of `low` or `high` `np.ndarray`s with
//    *         `low` and `high` scalars defaulting to a shape of (1,)
//    *     dtype: The dtype of the elements of the space. If this is an integer type, the :class:`Box` is essentially a discrete space.
//    *     seed: Optionally, you can use this argument to seed the RNG that is used to sample from the space.
//    * 
//    * Raises:
//    *     ValueError: If no shape information is provided (shape is None, low is None and high is None) then a
//    *         value error is raised.
//    */
//   constructor({
//     low,
//     high,
//     shape,
//     seed,
//   }: {
//     low: tf.Tensor;
//     high: tf.Tensor;
//     shape: number[];
//     seed?: number;
//   }) {
//     if (low.shape.some((d, i) => d != shape[i])) {
//       throw new RangeError(`The number of dimensions of the box (${shape}) did not match the shape of the vector of lower bounds (${low.shape}).`);
//     }
//     if (high.shape.some((d, i) => d != shape[i])) {
//       throw new RangeError(`The number of dimensions of the box (${shape}) did not match the shape of the vector of upper bounds (${high.shape}).`);
//     }

//     this.high = high.broadcastTo(shape);
//     this.low = low.broadcastTo(shape);

//     this.shape = shape;
//     this.seed = seed;

//     this.boundedAbove = this.high.isFinite();
//     this.boundedBelow = this.low.isFinite();
//   }

//   /*
//    * Generates a single random sample inside the Box.
//    * 
//    * In creating a sample of the box, each coordinate is sampled (independently) from a distribution
//    * that is chosen according to the form of the interval:
//    * 
//    * * :math:`[a, b]` : uniform distribution
//    * * :math:`[a, \infty)` : shifted exponential distribution
//    * * :math:`(-\infty, b]` : shifted negative exponential distribution
//    * * :math:`(-\infty, \infty)` : normal distribution
//    * 
//    * Args:
//    *     mask: A mask for sampling values from the Box space, currently unsupported.
//    * 
//    * Returns:
//    *     A sampled value from the Box
//    */
//   sample(): tf.Tensor {

//     // Masking arrays which classify the coordinates according to interval
//     // type
//     const unbounded = this.boundedBelow.logicalNot().logicalAnd(this.boundedAbove.logicalNot());
//     const uppBounded = this.boundedBelow.logicalNot().logicalAnd(this.boundedAbove);
//     const lowBounded = this.boundedBelow.logicalAnd(this.boundedAbove.logicalNot());
//     const bounded = this.boundedBelow.logicalAnd(this.boundedAbove);

//     // Vectorized sampling by interval type
//     const highWithoutInf = this.high.where(this.high.isFinite(), tf.zeros(this.high.shape));
//     const lowWithoutInf = this.low.where(this.low.isFinite(), tf.zeros(this.low.shape));

//     const sample = tf.fill(this.shape, 0)
//       .add(unbounded.mul(tf.randomNormal(unbounded.shape)))
//       .add(lowBounded.mul(this._randomExponential(lowBounded.shape).add(lowWithoutInf)))
//       .add(uppBounded.mul(this._randomExponential(uppBounded.shape).neg().add(highWithoutInf)))
//       .add(bounded.mul(tf.randomUniform(bounded.shape).mul(highWithoutInf.sub(lowWithoutInf)).add(lowWithoutInf)));
//     return sample;
//   }

//   _randomExponential(shape: number[]): tf.Tensor {
//     return tf.randomUniform(shape).log().neg();
//   }

// }
